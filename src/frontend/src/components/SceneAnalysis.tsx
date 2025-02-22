import React, { useEffect, useRef } from 'react';
import '../styles/SceneAnalysis.css';

interface Object {
  name: string;
  position?: { x: number; y: number };
  confidence: number;
}

interface Relationship {
  object1: string;
  object2: string;
  relationship: string;
}

interface Analysis {
  objects: Object[];
  sceneDescription: string;
  relationships: Relationship[];
  timestamp: number;
}

interface SceneAnalysisProps {
  analysis: Analysis | null;
}

const SceneAnalysis: React.FC<SceneAnalysisProps> = ({ analysis }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw bounding boxes and labels on canvas
  useEffect(() => {
    if (!analysis || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw detected objects
    analysis.objects.forEach((object) => {
      if (object.position) {
        // Convert normalized coordinates to canvas coordinates
        const x = object.position.x * canvas.width;
        const y = object.position.y * canvas.height;
        const width = 100; // Default width
        const height = 100; // Default height

        // Draw bounding box
        ctx.strokeStyle = `rgba(255, 0, 0, ${object.confidence})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Draw label
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.font = '14px Arial';
        ctx.fillText(
          `${object.name} (${Math.round(object.confidence * 100)}%)`,
          x,
          y - 5
        );
      }
    });
  }, [analysis]);

  if (!analysis) {
    return (
      <div className="scene-analysis">
        <div className="waiting-message">
          Waiting for video analysis...
        </div>
      </div>
    );
  }

  return (
    <div className="scene-analysis">
      <div className="analysis-container">
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="analysis-canvas"
          />
        </div>

        <div className="scene-description">
          <h3>Scene Description</h3>
          <p>{analysis.sceneDescription}</p>
        </div>

        <div className="objects-list">
          <h3>Detected Objects</h3>
          <ul>
            {analysis.objects.map((object, index) => (
              <li key={index}>
                {object.name} - Confidence: {Math.round(object.confidence * 100)}%
              </li>
            ))}
          </ul>
        </div>

        <div className="relationships">
          <h3>Spatial Relationships</h3>
          <ul>
            {analysis.relationships.map((rel, index) => (
              <li key={index}>
                {rel.object1} {rel.relationship} {rel.object2}
              </li>
            ))}
          </ul>
        </div>

        <div className="timestamp">
          Last updated: {new Date(analysis.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default SceneAnalysis;