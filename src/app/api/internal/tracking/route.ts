import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { track } from '@/lib/analytics';
import { trackingCell, type CellResponse } from '@/lib/tracking-cell';

// The tracking data and rules live in the tracking cell (SPEC-003,
// bookchaowalit/productivity-tracking-api). This route keeps the web's own concerns: the internal secret,
// input checks, whether the NextAuth user exists (sign-in data stays here), and product analytics.
// The cell owns everything else: shared items, the caller's tracking row, the activity log in the same
// transaction, and 404 for an item that is someone else's.
export const runtime = 'nodejs';

const INTERNAL_SECRET_HEADER = 'x-internal-secret';

function unauthorized() {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Basic secret check to prevent public access
function checkSecret(request: NextRequest) {
    const secret = request.headers.get(INTERNAL_SECRET_HEADER);
    return secret && secret === process.env.INTERNAL_API_SECRET;
}

type WriteMeta = {
    source?: string;
    category?: string;
    status?: string;
    fields_changed?: string[];
    completed_now?: boolean;
};

const meta = (response: CellResponse<Record<string, unknown>>) => (response.body?.meta ?? {}) as WriteMeta;
// The cell's `meta` is for this route only; the browser gets the same shape as before.
const withoutMeta = (body: Record<string, unknown>) => {
    const { meta: _ignored, ...rest } = body;
    return rest;
};

// A failure is reported only for a known user and only when the write did not
// commit, so a committed write is never counted as failed (AC-07).
async function trackFailure(userId: unknown, committed: boolean, method: string, status: number) {
    if (committed || typeof userId !== 'string' || !userId) return;
    await track('tracking_write_failed', userId, { method, status_code: status });
}

function notOwned() {
    return NextResponse.json({ error: 'Tracking item not found' }, { status: 404 });
}

export async function GET(request: NextRequest) {
    if (!checkSecret(request)) return unauthorized();

    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }
        const response = await trackingCell.list(userId, {
            category: searchParams.get('category'),
            status: searchParams.get('status'),
            isFavorite: searchParams.get('isFavorite') === 'true',
            search: searchParams.get('search'),
        });
        if (response.status !== 200) throw new Error(`tracking cell answered ${response.status}`);
        return NextResponse.json(response.body);
    } catch (error) {
        console.error('Error fetching tracking items:', error);
        return NextResponse.json({ error: 'Failed to fetch tracking items' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!checkSecret(request)) return unauthorized();

    let actor: unknown;
    let committed = false;
    try {
        const body = await request.json();
        const { userId, title, category } = body;

        if (!userId || !title || !category) {
            return NextResponse.json({ error: 'User ID, title, and category are required' }, { status: 400 });
        }
        actor = userId;

        // Sign-in data stays in the web: the user must exist here before the cell stores anything for them.
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            await trackFailure(actor, committed, 'POST', 404);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const fields = [
            'title', 'description', 'imageUrl', 'externalUrl', 'category', 'author', 'year', 'genres',
            'totalEpisodes', 'totalChapters', 'totalBooks', 'status', 'rating', 'progress', 'priority', 'isFavorite',
        ];
        const payload = Object.fromEntries(fields.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));
        const response = await trackingCell.add(userId, payload);
        if (response.status === 201) {
            committed = true;
            const info = meta(response);
            await track('tracking_item_added', userId, { category: info.category, source: info.source, status: info.status });
            return NextResponse.json(withoutMeta(response.body), { status: 201 });
        }
        if (response.status === 409) {
            await trackFailure(actor, committed, 'POST', 409);
            return NextResponse.json({ error: 'This item is already on your list' }, { status: 409 });
        }
        if (response.status === 400) {
            await trackFailure(actor, committed, 'POST', 400);
            return NextResponse.json({ error: 'Invalid tracking item' }, { status: 400 });
        }
        throw new Error(`tracking cell answered ${response.status}`);
    } catch (error) {
        console.error('Error creating tracking item:', error);
        await trackFailure(actor, committed, 'POST', 500);
        return NextResponse.json({ error: 'Failed to create tracking item' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    if (!checkSecret(request)) return unauthorized();

    let actor: unknown;
    let committed = false;
    try {
        const body = await request.json();
        const { userId, itemId } = body;

        if (!userId || !itemId) {
            return NextResponse.json({ error: 'User ID and item ID are required' }, { status: 400 });
        }
        actor = userId;

        // Omitted fields stay as they are; an explicit null clears them (the cell applies the same rule).
        const fields = ['status', 'rating', 'progress', 'startDate', 'finishDate', 'priority', 'isFavorite'];
        const payload = Object.fromEntries(fields.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));
        const response = await trackingCell.update(userId, itemId, payload);
        if (response.status === 404) {
            await trackFailure(actor, committed, 'PUT', 404);
            return notOwned();
        }
        if (response.status === 400) {
            await trackFailure(actor, committed, 'PUT', 400);
            return NextResponse.json({ error: 'Invalid tracking update' }, { status: 400 });
        }
        if (response.status !== 200) throw new Error(`tracking cell answered ${response.status}`);
        committed = true;
        const info = meta(response);
        const fieldsChanged = info.fields_changed ?? [];
        // Sent together so a completing update waits for one timeout at most.
        await Promise.all([
            fieldsChanged.length > 0
                && track('tracking_updated', userId, { fields_changed: fieldsChanged, status: info.status }),
            info.completed_now && track('tracking_item_completed', userId, { category: info.category }),
        ]);
        return NextResponse.json(withoutMeta(response.body));
    } catch (error) {
        console.error('Error updating tracking item:', error);
        await trackFailure(actor, committed, 'PUT', 500);
        return NextResponse.json({ error: 'Failed to update tracking item' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    if (!checkSecret(request)) return unauthorized();

    let actor: unknown;
    let committed = false;
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        const itemId = searchParams.get('itemId');

        if (!userId || !itemId) {
            return NextResponse.json({ error: 'User ID and item ID are required' }, { status: 400 });
        }
        actor = userId;

        const response = await trackingCell.remove(userId, itemId);
        if (response.status === 404) {
            await trackFailure(actor, committed, 'DELETE', 404);
            return notOwned();
        }
        if (response.status !== 200) throw new Error(`tracking cell answered ${response.status}`);
        committed = true;
        await track('tracking_item_removed', userId, { category: meta(response).category });
        return NextResponse.json({ message: 'Tracking item removed successfully' });
    } catch (error) {
        console.error('Error deleting tracking item:', error);
        await trackFailure(actor, committed, 'DELETE', 500);
        return NextResponse.json({ error: 'Failed to delete tracking item' }, { status: 500 });
    }
}
