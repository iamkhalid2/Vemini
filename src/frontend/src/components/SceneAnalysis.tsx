import React, { useEffect, useRef } from 'react';
import '../styles/SceneAnalysis.css';

interface Object {
  name: string;
  position?: { x: number; y: number };
  confidence: number;
}

interface Action {
  description: string;
  objects: string[];
  confidence: number;
}

interface Analysis {
  objects: Object[];
  actions: Action[];
  sceneDescription: string;
  relationships: Array<{
    object1: string;
    object2: string;
    relationship: string;
  }>;
  timestamp: number;
}

interface SceneAnalysisProps {
  analysis: Analysis | null;
}

const SceneAnalysis: React.FC<SceneAnalysisProps> = ({ analysis }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastAnalysisRef = useRef<Analysis | null>(null);

  // Draw scene visualization
  useEffect(() => {
    if (!analysis || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw detected objects with motion trails
    analysis.objects.forEach((object, index) => {
      if (object.position) {
        // Convert normalized coordinates to canvas coordinates
        const x = object.position.x * canvas.width;
        const y = object.position.y * canvas.height;
        const width = 100;
        const height = 100;

        // Draw motion trail if object existed in previous frame
        if (lastAnalysisRef.current) {
          const prevObject = lastAnalysisRef.current.objects.find(o => o.name === object.name);
          if (prevObject?.position) {
            const prevX = prevObject.position.x * canvas.width;
            const prevY = prevObject.position.y * canvas.height;
            
            // Draw motion trail
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 0, 0, ${object.confidence * 0.3})`;
            ctx.setLineDash([5, 5]);
            ctx.moveTo(prevX + width/2, prevY + height/2);
            ctx.lineTo(x + width/2, y + height/2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // Draw bounding box
        ctx.strokeStyle = `rgba(255, 0, 0, ${object.confidence})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Draw label with confidence
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.font = '14px Arial';
        ctx.fillText(
          `${object.name} (${Math.round(object.confidence * 100)}%)`,
          x,
          y - 5
        );
      }
    });

    // Store current analysis for motion tracking
    lastAnalysisRef.current = analysis;
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

        <div className="actions-list">
          <h3>Detected Actions</h3>
          <ul>
            {analysis.actions.map((action, index) => (
              <li key={index} className="action-item">
                <div className="action-description">
                  {action.description}
                </div>
                <div className="action-objects">
                  Objects involved: {action.objects.join(', ')}
                </div>
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill"
                    style={{ width: `${action.confidence * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="objects-list">
          <h3>Detected Objects</h3>
          <ul>
            {analysis.objects.map((object, index) => (
              <li key={index} className="object-item">
                <span className="object-name">{object.name}</span>
                <div className="confidence-indicator">
                  <div 
                    className="confidence-bar"
                    style={{ width: `${object.confidence * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relationships-list">
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