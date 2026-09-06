"use client";

import React from 'react';

export default function Workflow() {
  return (
    <div className="py-12 bg-emerald-50 text-center">
      <h3 className="text-xl font-bold text-emerald-900">Sugarcane Leaf Analysis Workflow</h3>
      <p className="text-sm text-emerald-700 mt-2">
        Upload a leaf photo to trigger real server-side SavedModel inference via /api/predict.
      </p>
    </div>
  );
}
