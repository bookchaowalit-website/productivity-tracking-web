import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { track } from '@/lib/analytics';
import { ContentCategory, TrackingStatus, RatingScale, Prisma } from '@prisma/client';

// Run on Node.js runtime so Prisma Client is supported
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

// Items are shared between users; what a user owns is their UserTracking row.
// Update and delete first load that row by (userId, itemId), so an item that
// is someone else's (or does not exist) gives the same 404 and nothing changes.
function findOwnedTracking(userId: string, itemId: string) {
    return prisma.userTracking.findUnique({
        where: { userId_itemId: { userId, itemId } },
        include: { item: true }
    });
}

// Fields whose stored change counts as an update (SPEC-001 AC-06).
const UPDATABLE_FIELDS = ['status', 'progress', 'rating', 'isFavorite', 'priority', 'startDate', 'finishDate'] as const;

function sameValue(a: unknown, b: unknown) {
    if (a instanceof Date || b instanceof Date) {
        return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
    }
    return (a ?? null) === (b ?? null);
}

function changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
    return UPDATABLE_FIELDS.filter((field) => !sameValue(before[field], after[field]));
}

// A failure is reported only for a known user and only when the main write did
// not commit, so a committed write is never counted as failed (AC-07).
async function trackFailure(userId: unknown, committed: boolean, method: string, status: number) {
    if (committed || typeof userId !== 'string' || !userId) return;
    await track('tracking_write_failed', userId, { method, status_code: status });
}

function notOwned() {
    return NextResponse.json({ error: 'Tracking item not found' }, { status: 404 });
}

function isUniqueViolation(error: unknown) {
    return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}

export async function GET(request: NextRequest) {
    if (!checkSecret(request)) return unauthorized();

    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        const category = searchParams.get('category') as ContentCategory | null;
        const status = searchParams.get('status') as TrackingStatus | null;
        const isFavorite = searchParams.get('isFavorite') === 'true';
        const search = searchParams.get('search');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const where: Prisma.TrackingItemWhereInput = {
            userTrackings: {
                some: { userId }
            }
        };

        if (category) where.category = category;
        if (status) where.userTrackings = { some: { userId, status } };
        if (isFavorite) where.userTrackings = { some: { userId, isFavorite: true } };
        if (search) where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { author: { contains: search, mode: 'insensitive' } }
        ];

        const items = await prisma.trackingItem.findMany({
            where,
            include: {
                userTrackings: {
                    where: { userId },
                    select: {
                        status: true,
                        rating: true,
                        progress: true,
                        startDate: true,
                        finishDate: true,
                        priority: true,
                        isFavorite: true,
                    }
                },
                _count: { select: { userTrackings: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json(items);
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
        const {
            userId,
            title,
            description,
            imageUrl,
            externalUrl,
            category,
            author,
            year,
            genres,
            totalEpisodes,
            totalChapters,
            totalBooks,
            status,
            rating,
            progress,
            priority,
            isFavorite
        } = body;

        if (!userId || !title || !category) {
            return NextResponse.json({ error: 'User ID, title, and category are required' }, { status: 400 });
        }
        actor = userId;

        // Ensure user exists
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            await trackFailure(actor, committed, 'POST', 404);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const existingItem = await prisma.trackingItem.findFirst({
            where: { title: { equals: title, mode: 'insensitive' }, category }
        });

        let trackingItem;

        if (existingItem) {
            trackingItem = await prisma.userTracking.create({
                data: {
                    userId,
                    itemId: existingItem.id,
                    status: status || TrackingStatus.PLAN_TO_WATCH,
                    rating: rating ? RatingScale[rating as keyof typeof RatingScale] : null,
                    progress,
                    priority,
                    isFavorite: isFavorite || false,
                },
                include: { item: true }
            });
            committed = true;
            await track('tracking_item_added', userId, {
                category: existingItem.category,
                source: 'existing_item',
                status: trackingItem.status,
            });

            await prisma.activityLog.create({
                data: {
                    userId,
                    action: 'added_to_list',
                    itemTitle: existingItem.title,
                    category: existingItem.category,
                }
            });
        } else {
            const newItem = await prisma.trackingItem.create({
                data: {
                    title,
                    description,
                    imageUrl,
                    externalUrl,
                    category: category as ContentCategory,
                    author,
                    year,
                    genres: genres || [],
                    totalEpisodes,
                    totalChapters,
                    totalBooks,
                    userTrackings: {
                        create: {
                            userId,
                            status: status || TrackingStatus.PLAN_TO_WATCH,
                            rating: rating ? RatingScale[rating as keyof typeof RatingScale] : null,
                            progress,
                            priority,
                            isFavorite: isFavorite || false,
                        }
                    }
                },
                include: { userTrackings: { where: { userId } } }
            });
            committed = true;
            await track('tracking_item_added', userId, {
                category: newItem.category,
                source: 'new_item',
                status: newItem.userTrackings[0]?.status,
            });

            await prisma.activityLog.create({
                data: {
                    userId,
                    action: 'created_item',
                    itemTitle: newItem.title,
                    category: newItem.category,
                }
            });

            trackingItem = newItem;
        }

        return NextResponse.json(trackingItem, { status: 201 });
    } catch (error) {
        if (isUniqueViolation(error)) {
            await trackFailure(actor, committed, 'POST', 409);
            return NextResponse.json({ error: 'This item is already on your list' }, { status: 409 });
        }
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
        const { userId, itemId, status, rating, progress, startDate, finishDate, priority, isFavorite } = body;

        if (!userId || !itemId) {
            return NextResponse.json({ error: 'User ID and item ID are required' }, { status: 400 });
        }
        actor = userId;

        const currentTracking = await findOwnedTracking(userId, itemId);
        if (!currentTracking) {
            await trackFailure(actor, committed, 'PUT', 404);
            return notOwned();
        }

        // Keyed by (userId, itemId) again, so the write itself can only ever
        // touch the caller's own row.
        const updatedTracking = await prisma.userTracking.update({
            where: { userId_itemId: { userId, itemId } },
            data: {
                // Omitted fields stay as they are; an explicit null clears them.
                status: status || undefined,
                rating: rating === null ? null : rating ? RatingScale[rating as keyof typeof RatingScale] : undefined,
                progress,
                startDate: startDate === null ? null : startDate ? new Date(startDate) : undefined,
                finishDate: finishDate === null ? null : finishDate ? new Date(finishDate) : undefined,
                priority,
                isFavorite
            },
            include: { item: true }
        });
        committed = true;
        const fieldsChanged = changedFields(currentTracking, updatedTracking);
        const completedNow = updatedTracking.status === TrackingStatus.COMPLETED
            && currentTracking.status !== TrackingStatus.COMPLETED;
        // Sent together so a completing update waits for one timeout at most.
        await Promise.all([
            fieldsChanged.length > 0
                && track('tracking_updated', userId, { fields_changed: fieldsChanged, status: updatedTracking.status }),
            completedNow && track('tracking_item_completed', userId, { category: currentTracking.item.category }),
        ]);

        if (status === TrackingStatus.COMPLETED && currentTracking.status !== TrackingStatus.COMPLETED) {
            await prisma.activityLog.create({
                data: {
                    userId,
                    action: 'completed',
                    itemTitle: currentTracking.item.title,
                    category: currentTracking.item.category,
                    details: `Rated ${rating || 'unrated'}`,
                }
            });
        } else if (rating && rating !== currentTracking.rating) {
            await prisma.activityLog.create({
                data: {
                    userId,
                    action: 'rated',
                    itemTitle: currentTracking.item.title,
                    category: currentTracking.item.category,
                    details: `Rated ${rating}/10`,
                }
            });
        }

        return NextResponse.json(updatedTracking);
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

        const tracking = await findOwnedTracking(userId, itemId);
        if (!tracking) {
            await trackFailure(actor, committed, 'DELETE', 404);
            return notOwned();
        }

        await prisma.userTracking.delete({ where: { userId_itemId: { userId, itemId } } });
        committed = true;
        await track('tracking_item_removed', userId, { category: tracking.item.category });

        await prisma.activityLog.create({
            data: {
                userId,
                action: 'removed_from_list',
                itemTitle: tracking.item.title,
                category: tracking.item.category,
            }
        });

        return NextResponse.json({ message: 'Tracking item removed successfully' });
    } catch (error) {
        console.error('Error deleting tracking item:', error);
        await trackFailure(actor, committed, 'DELETE', 500);
        return NextResponse.json({ error: 'Failed to delete tracking item' }, { status: 500 });
    }
}
