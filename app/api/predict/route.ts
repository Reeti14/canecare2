export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('image') as File | null;
        if (!file) {
            return NextResponse.json({ error: 'No image file provided in field "image"' }, { status: 400 });
        }

        // Send to Render backend
        const renderFormData = new FormData();
        renderFormData.append('file', file);

        const response = await fetch('https://canecare-backend.onrender.com/predict', {
            method: 'POST',
            body: renderFormData,
        });

        if (!response.ok) {
            const error = await response.text();
            return NextResponse.json({ error }, { status: 500 });
        }

        const result = await response.json();
        return NextResponse.json(result);

    } catch (e: any) {
        console.error('Prediction API Error:', e);
        return NextResponse.json({ error: e.message || 'Prediction failed' }, { status: 500 });
    }
}