# Image Annotation System

## Overview

This document describes the Label Studio-style image annotation system implemented for the ELIES Scientific Integrity Platform. The system allows users to annotate images with multiple shape types (rectangles, ellipses, polygons) and assign labels for training manipulation detection models.

## Features

### Drawing Tools
- **Select/Move (V)**: Select and move existing annotations
- **Rectangle (R)**: Click and drag to draw rectangular regions
- **Ellipse (E)**: Click and drag to draw elliptical regions
- **Polygon (P)**: Click to add points, double-click or click first point to close
- **Delete**: Click on annotations to delete them

### Labels
Pre-defined labels with distinct colors:
- **Manipulation** (Red): General image manipulation
- **Copy-Move** (Blue): Copy-move forgery with group support
- **Splicing** (Green): Image splicing/compositing
- **Inpainting** (Amber): Content removal/filling
- **Enhancement** (Purple): Significant image enhancement
- **AI Generated** (Pink): AI-generated content

### Keyboard Shortcuts
- `V` - Select tool
- `R` - Rectangle tool
- `E` - Ellipse tool
- `P` - Polygon tool
- `Delete/Backspace` - Delete selected annotation
- `Escape` - Cancel drawing or clear selection
- `Ctrl+Z` - Undo
- `Ctrl+Y` or `Ctrl+Shift+Z` - Redo
- `Ctrl+Mouse wheel` - Zoom

### Features
- Undo/Redo with full history
- Zoom and pan support
- Resize handles for rectangles and ellipses
- Point editing for polygons
- Label filtering in the panel
- Export to JSON format
- Responsive UI

## JSON Schema

### Export Format

```json
{
  "version": "1.0",
  "image": {
    "id": "string",
    "filename": "string",
    "width": "number",
    "height": "number"
  },
  "annotations": [
    {
      "id": "string",
      "type": "rectangle | ellipse | polygon",
      "label": "string",
      "labelName": "string",
      "color": "string (hex)",
      "groupId": "number | null",
      "description": "string",
      "confidence": "number | null",
      "createdAt": "ISO8601 datetime",
      "coords": {
        // For rectangle/ellipse (in percentage of image dimensions):
        "x": "number (0-100)",
        "y": "number (0-100)", 
        "width": "number (0-100)",
        "height": "number (0-100)",
        
        // For polygon:
        "points": [
          { "x": "number (0-100)", "y": "number (0-100)" }
        ]
      }
    }
  ],
  "exportedAt": "ISO8601 datetime"
}
```

### Internal State Format

```typescript
interface Annotation {
  id: string;
  type: 'rectangle' | 'ellipse' | 'polygon';
  label: {
    id: string;
    name: string;
    color: string;
  };
  groupId?: number;  // For copy-move pairs
  description?: string;
  confidence?: number;
  createdAt: string;
  
  // Rectangle/Ellipse (in pixels)
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  
  // Polygon (in pixels)
  points?: Array<{ x: number; y: number }>;
}
```

### API Format (Backend)

```json
{
  "image_id": "string",
  "text": "string (description)",
  "coords": {
    "x": "number (percentage)",
    "y": "number (percentage)",
    "width": "number (percentage)",
    "height": "number (percentage)",
    "points": [{ "x": "number", "y": "number" }]  // For polygons
  },
  "type": "manipulation | copy-move | splicing | inpainting | enhancement | generation",
  "group_id": "number | null",
  "shape_type": "rectangle | ellipse | polygon"
}
```

## Component Structure

```
src/
├── components/
│   └── annotation/
│       ├── index.js              # Exports all components
│       ├── ImageAnnotator.jsx    # Main annotator component
│       ├── AnnotationToolbar.jsx # Toolbar with tools and actions
│       ├── LabelsPanel.jsx       # Side panel for labels/regions
│       ├── SVGAnnotationLayer.jsx# SVG overlay for drawing
│       └── AnnotationModal.jsx   # Full-screen annotation modal
├── context/
│   └── AnnotationContext.jsx     # State management
└── utils/
    └── annotationHelpers.js      # Geometry and utility functions
```

## Usage

### Basic Usage (Modal)

```jsx
import { AnnotationModal } from '../components/annotation';

<AnnotationModal
  isOpen={showModal}
  imageUrl={imageUrl}
  imageId={imageId}
  imageName="example.jpg"
  existingAnnotations={annotations}
  onClose={() => setShowModal(false)}
  onSaveSuccess={(saved) => console.log('Saved:', saved)}
/>
```

### Standalone Annotator

```jsx
import { ImageAnnotator } from '../components/annotation';

<ImageAnnotator
  imageUrl={imageUrl}
  imageId={imageId}
  existingAnnotations={annotations}
  onSave={async (annotations) => {
    // Save to backend
  }}
  onExport={(data) => {
    // Handle export
  }}
/>
```

### Using the Context

```jsx
import { AnnotationProvider, useAnnotation } from '../components/annotation';

function MyComponent() {
  const { state, actions, computed } = useAnnotation();
  
  // Access state
  const { annotations, selectedId, activeTool } = state;
  
  // Use actions
  actions.setTool('rectangle');
  actions.addAnnotation({ ... });
  actions.undo();
  
  // Use computed values
  const { canUndo, canRedo, selectedAnnotation } = computed;
}
```

## API Endpoints

### Get Annotations
```
GET /annotations?image_id={imageId}
```

### Create Annotation
```
POST /annotations
Body: {
  image_id: string,
  text: string,
  coords: object,
  type: string,
  group_id: number | null,
  shape_type: string
}
```

### Update Annotation
```
PUT /annotations/{annotationId}
Body: { ...annotation data }
```

### Delete Annotation
```
DELETE /annotations/{annotationId}
```

## Training Data Format

For ML model training, export the annotations and convert to common formats:

### COCO Format
```json
{
  "images": [{ "id": 1, "file_name": "...", "width": 800, "height": 600 }],
  "annotations": [{
    "id": 1,
    "image_id": 1,
    "category_id": 1,
    "bbox": [x, y, width, height],  // or "segmentation" for polygons
    "area": 1234
  }],
  "categories": [{ "id": 1, "name": "manipulation" }]
}
```

### Pascal VOC Format (XML)
```xml
<annotation>
  <filename>image.jpg</filename>
  <size><width>800</width><height>600</height></size>
  <object>
    <name>manipulation</name>
    <bndbox>
      <xmin>100</xmin><ymin>100</ymin>
      <xmax>200</xmax><ymax>200</ymax>
    </bndbox>
  </object>
</annotation>
```

## Copy-Move Group Support

For copy-move detection, annotations can be grouped:

```jsx
// Group 1 might contain the source and destination regions
{
  type: 'copy-move',
  groupId: 1,
  // ...
}
```

The UI shows group badges on copy-move annotations and provides a group ID selector.
