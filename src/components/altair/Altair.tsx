/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";
import "./altair.scss";
import { RiLoader2Line } from "react-icons/ri";

// Define the function declaration for Altair graph rendering
const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

function AltairComponent() {
  const [jsonString, setJSONString] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const { client, setConfig } = useLiveAPIContext();
  
  // Set up the Gemini model configuration
  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: 'You are my helpful assistant. Any time I ask you for a graph call the "render_altair" function I have provided you. Dont ask for additional information just make your best judgement.',
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [declaration] },
      ],
    });
  }, [setConfig]);
  
  // Handle tool calls from the model
  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      setIsLoading(true);
      
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name,
      );
      
      if (fc) {
        try {
          const str = (fc.args as any).json_graph;
          setJSONString(str);
          setIsVisible(true);
          setError(null);
        } catch (err) {
          console.error("Error processing graph data:", err);
          setError("Failed to process graph data");
        }
      }
      
      // Send tool response to acknowledge successful processing
      if (toolCall.functionCalls.length) {
        setTimeout(
          () => {
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls.map((fc) => ({
                response: { output: { success: true } },
                id: fc.id,
              })),
            });
            setIsLoading(false);
          },
          200,
        );
      }
    };
    
    client.on("toolcall", onToolCall);
    
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);
  
  // Embed the Vega visualization
  const embedRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (embedRef.current && jsonString) {
      try {
        setIsLoading(true);
        
        vegaEmbed(embedRef.current, JSON.parse(jsonString), {
          actions: true,
          theme: 'dark',
          renderer: 'canvas',
          config: {
            background: 'transparent',
            title: {
              color: '#F0F3F6',
              fontSize: 18,
              font: 'Inter, sans-serif',
              fontWeight: 600,
            },
            axis: {
              labelColor: '#C9D1D9',
              titleColor: '#F0F3F6',
              gridColor: '#30363D',
              domainColor: '#484F58',
              tickColor: '#484F58',
            },
            legend: {
              labelColor: '#C9D1D9',
              titleColor: '#F0F3F6',
              symbolSize: 100,
            },
            range: {
              category: [
                '#7C5DFA', '#00C2FF', '#00CA90', '#FFB800', 
                '#FF4757', '#C77DFF', '#F97583', '#79C0FF'
              ],
            },
          }
        })
        .then(() => setIsLoading(false))
        .catch(err => {
          console.error("Error rendering visualization:", err);
          setError("Failed to render visualization");
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Error with Vega embed:", err);
        setError("Failed to render visualization");
        setIsLoading(false);
      }
    }
  }, [embedRef, jsonString]);
  
  // If no graph yet, show an empty state
  if (!isVisible) {
    return (
      <div className="altair-container empty">
        <div className="altair-empty-state">
          <div className="icon-container">
            <svg className="chart-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 17L8 12" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 17L12 8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17L16 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 20.5L21 20.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3>Data Visualization</h3>
          <p>Ask Gemini to create a chart or graph for you</p>
          <div className="examples">
            <p className="example-title">Examples:</p>
            <ul>
              <li>"Create a bar chart of population by country"</li>
              <li>"Show me a scatter plot of height vs weight"</li>
              <li>"Make a line graph of stock prices over time"</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="altair-container loading">
        <div className="loader">
          <RiLoader2Line className="spinner" />
          <span>Generating visualization...</span>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="altair-container error">
        <div className="error-message">
          <span className="error-icon">!</span>
          <h3>Visualization Error</h3>
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => {
              setError(null);
              setIsVisible(false);
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  // Show the visualization
  return (
    <div className="altair-container">
      <div className="vega-visualization" ref={embedRef} />
      
      <button 
        className="reset-button"
        onClick={() => {
          setJSONString("");
          setIsVisible(false);
        }}
        aria-label="Clear visualization"
      >
        Reset Visualization
      </button>
    </div>
  );
}

export const Altair = memo(AltairComponent);
