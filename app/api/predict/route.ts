export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { predictWithSavedModel } from '@/lib/model';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('image') as File | null;
        if (!file) {
            return NextResponse.json({ error: 'No image file provided in field "image"' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await predictWithSavedModel(buffer);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (e: any) {
        console.error('Prediction API Error:', e);
        return NextResponse.json({ error: e.message || 'Prediction failed' }, { status: 500 });
    }
}