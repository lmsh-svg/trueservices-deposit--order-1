import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orderAttachments } from '@/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single record fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(orderAttachments)
        .where(eq(orderAttachments.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ 
          error: 'Order attachment not found',
          code: "NOT_FOUND" 
        }, { status: 404 });
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // List with pagination, filtering, and sorting
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const orderId = searchParams.get('orderId');
    const fileType = searchParams.get('fileType');
    const uploadedByAdminId = searchParams.get('uploadedByAdminId');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    let query = db.select().from(orderAttachments);

    // Build where conditions
    const conditions = [];
    
    if (orderId) {
      if (isNaN(parseInt(orderId))) {
        return NextResponse.json({ 
          error: "Valid orderId is required",
          code: "INVALID_ORDER_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(orderAttachments.orderId, parseInt(orderId)));
    }

    if (fileType) {
      conditions.push(eq(orderAttachments.fileType, fileType));
    }

    if (uploadedByAdminId) {
      if (isNaN(parseInt(uploadedByAdminId))) {
        return NextResponse.json({ 
          error: "Valid uploadedByAdminId is required",
          code: "INVALID_ADMIN_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(orderAttachments.uploadedByAdminId, parseInt(uploadedByAdminId)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortColumn = orderAttachments[sort as keyof typeof orderAttachments] || orderAttachments.createdAt;
    const sortOrder = order === 'asc' ? asc(sortColumn) : desc(sortColumn);
    query = query.orderBy(sortOrder);

    // Apply pagination
    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, fileUrl, fileType, uploadedByAdminId } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json({ 
        error: "orderId is required",
        code: "MISSING_ORDER_ID" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(orderId))) {
      return NextResponse.json({ 
        error: "orderId must be a valid integer",
        code: "INVALID_ORDER_ID" 
      }, { status: 400 });
    }

    if (!fileUrl || fileUrl.trim() === '') {
      return NextResponse.json({ 
        error: "fileUrl is required and cannot be empty",
        code: "MISSING_FILE_URL" 
      }, { status: 400 });
    }

    if (!fileType || fileType.trim() === '') {
      return NextResponse.json({ 
        error: "fileType is required and cannot be empty",
        code: "MISSING_FILE_TYPE" 
      }, { status: 400 });
    }

    // Validate uploadedByAdminId if provided
    if (uploadedByAdminId !== undefined && uploadedByAdminId !== null) {
      if (isNaN(parseInt(uploadedByAdminId))) {
        return NextResponse.json({ 
          error: "uploadedByAdminId must be a valid integer or null",
          code: "INVALID_ADMIN_ID" 
        }, { status: 400 });
      }
    }

    // Prepare insert data
    const insertData = {
      orderId: parseInt(orderId),
      fileUrl: fileUrl.trim(),
      fileType: fileType.trim(),
      uploadedByAdminId: uploadedByAdminId ? parseInt(uploadedByAdminId) : null,
      createdAt: new Date().toISOString(),
    };

    const newRecord = await db.insert(orderAttachments)
      .values(insertData)
      .returning();

    return NextResponse.json(newRecord[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existing = await db.select()
      .from(orderAttachments)
      .where(eq(orderAttachments.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Order attachment not found',
        code: "NOT_FOUND" 
      }, { status: 404 });
    }

    const body = await request.json();
    const { fileUrl, fileType, uploadedByAdminId } = body;

    // Validate fields if provided
    if (fileUrl !== undefined && fileUrl.trim() === '') {
      return NextResponse.json({ 
        error: "fileUrl cannot be empty",
        code: "INVALID_FILE_URL" 
      }, { status: 400 });
    }

    if (fileType !== undefined && fileType.trim() === '') {
      return NextResponse.json({ 
        error: "fileType cannot be empty",
        code: "INVALID_FILE_TYPE" 
      }, { status: 400 });
    }

    if (uploadedByAdminId !== undefined && uploadedByAdminId !== null && isNaN(parseInt(uploadedByAdminId))) {
      return NextResponse.json({ 
        error: "uploadedByAdminId must be a valid integer or null",
        code: "INVALID_ADMIN_ID" 
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {};

    if (fileUrl !== undefined) {
      updateData.fileUrl = fileUrl.trim();
    }

    if (fileType !== undefined) {
      updateData.fileType = fileType.trim();
    }

    if (uploadedByAdminId !== undefined) {
      updateData.uploadedByAdminId = uploadedByAdminId ? parseInt(uploadedByAdminId) : null;
    }

    // Only proceed if there are fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(existing[0], { status: 200 });
    }

    const updated = await db.update(orderAttachments)
      .set(updateData)
      .where(eq(orderAttachments.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existing = await db.select()
      .from(orderAttachments)
      .where(eq(orderAttachments.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Order attachment not found',
        code: "NOT_FOUND" 
      }, { status: 404 });
    }

    const deleted = await db.delete(orderAttachments)
      .where(eq(orderAttachments.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Order attachment deleted successfully',
      data: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}