import React, { useEffect, useRef } from 'react';
import '../styles/SceneAnalysis.css';

interface DetectedObject {
  name: string;
  position?: { x: number; y: number };
  confidence: number;
  lastSeenAt: number;
}

interface Action {
  description: string;
  objects: string[];
  confidence: number;
  timestamp: number;
}

interface Analysis {
  objects: DetectedObject[];
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
    analysis.objects.forEach((object) => {
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
            ctx.strokeStyle = `rgba(52, 152, 219, ${object.confidence * 0.3})`;
            ctx.setLineDash([5, 5]);
            ctx.moveTo(prevX + width/2, prevY + height/2);
            ctx.lineTo(x + width/2, y + height/2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // Draw bounding box
        ctx.strokeStyle = `rgba(52, 152, 219, ${object.confidence})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Draw label with confidence and time since last seen
        const timeSinceLastSeen = (Date.now() - object.lastSeenAt) / 1000;
        ctx.fillStyle = 'rgba(52, 152, 219, 0.8)';
        ctx.font = '14px Arial';
        ctx.fillText(
          `${object.name} (${Math.round(object.confidence * 100)}%)`,
          x,
          y - 20
        );
        ctx.font = '12px Arial';
        ctx.fillText(
          `Seen ${timeSinceLastSeen.toFixed(1)}s ago`,
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
          <h3>Recent Actions</h3>
          <ul>
            {analysis.actions.map((action, index) => (
              <li key={index} className="action-item">
                <div className="action-description">
                  {action.description}
                </div>
                <div className="action-objects">
                  Objects: {action.objects.join(', ')}
                </div>
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill"
                    style={{ width: `${action.confidence * 100}%` }}
                  />
                </div>
                <div className="action-time">
                  {((Date.now() - action.timestamp) / 1000).toFixed(1)}s ago
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
                <div className="object-name">{object.name}</div>
                <div className="object-confidence">
                  <div className="confidence-bar">
                    <div 
                      className="confidence-fill"
                      style={{ width: `${object.confidence * 100}%` }}
                    />
                  </div>
                </div>
                <div className="object-time">
                  {((Date.now() - object.lastSeenAt) / 1000).toFixed(1)}s ago
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relationships-list">
          <h3>Spatial Relationships</h3>
          <ul>
            {analysis.relationships.map((rel, index) => (
              <li key={index} className="relationship-item">
                <span className="object-1">{rel.object1}</span>
                <span className="relationship">{rel.relationship}</span>
                <span className="object-2">{rel.object2}</span>
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