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
import cn from "classnames";
import { useEffect, useRef, useState } from "react";
import { RiAiGenerate, RiCloseLine, RiMenu2Line } from "react-icons/ri";
import Select from "react-select";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useLoggerStore } from "../../lib/store-logger";
import Logger, { LoggerFilterType } from "../logger/Logger";
import "./side-panel.scss";

// Filter options for the logs
const filterOptions = [
  { value: "conversations", label: "Conversations" },
  { value: "tools", label: "Tool Use" },
  { value: "none", label: "All" },
];

export default function SidePanel() {
  const { connected, client } = useLiveAPIContext();
  const [open, setOpen] = useState(true);
  const loggerRef = useRef<HTMLDivElement>(null);
  const loggerLastHeightRef = useRef<number>(-1);
  const { log, logs } = useLoggerStore();
  const [textInput, setTextInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
  } | null>(filterOptions[0]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Scroll the log to the bottom when new logs come in
  useEffect(() => {
    if (loggerRef.current) {
      const el = loggerRef.current;
      const scrollHeight = el.scrollHeight;
      if (scrollHeight !== loggerLastHeightRef.current) {
        el.scrollTop = scrollHeight;
        loggerLastHeightRef.current = scrollHeight;
      }
    }
  }, [logs]);
  
  // Listen for log events and store them
  useEffect(() => {
    client.on("log", log);
    return () => {
      client.off("log", log);
    };
  }, [client, log]);
  
  // Handle input submission
  const handleSubmit = () => {
    if (!textInput.trim()) return;
    
    client.send([{ text: textInput }]);
    setTextInput("");
    
    // Focus the input field after submission
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Handle Enter key press for submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    }
  };
  
  return (
    <div className={`side-panel ${open ? "open" : ""}`}>
      <header className="panel-header">
        <div className="panel-header-content">
          <div className="logo-container">
            <RiAiGenerate className="logo-icon" />
            <h2 className="panel-title">Vemini</h2>
          </div>
          
          <button 
            className="panel-toggle" 
            aria-label={open ? "Collapse panel" : "Expand panel"}
            onClick={() => setOpen(!open)}
          >
            {open ? <RiCloseLine /> : <RiMenu2Line />}
          </button>
        </div>
        
        <div className={cn("streaming-indicator", { connected })}>
          <div className="indicator-dot"></div>
          <span className="indicator-text">
            {connected ? "Streaming" : "Paused"}
          </span>
        </div>
      </header>
      
      <div className="filter-container">
        <Select
          className="filter-select"
          classNamePrefix="filter-select"
          value={selectedOption}
          options={filterOptions}
          onChange={(option) => setSelectedOption(option)}
          isSearchable={false}
          aria-label="Filter logs"
          styles={{
            control: (baseStyles) => ({
              ...baseStyles,
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              minHeight: '38px',
              boxShadow: 'none',
              '&:hover': {
                borderColor: 'var(--color-primary)',
              },
            }),
            menu: (baseStyles) => ({
              ...baseStyles,
              backgroundColor: 'var(--color-bg-tertiary)',
            }),
            option: (styles, { isFocused, isSelected }) => ({
              ...styles,
              backgroundColor: isSelected 
                ? 'var(--color-primary)'
                : isFocused 
                  ? 'var(--color-bg-secondary)'
                  : undefined,
              '&:active': {
                backgroundColor: 'var(--color-primary-light)',
              },
            }),
            singleValue: (baseStyles) => ({
              ...baseStyles,
              color: 'var(--color-text-primary)',
            }),
          }}
        />
      </div>
      
      <div className="logs-container" ref={loggerRef}>
        <Logger
          filter={(selectedOption?.value as LoggerFilterType) || "none"}
        />
      </div>
      
      <div className={cn("input-container", { disabled: !connected })}>
        <div className="input-content">
          <textarea
            className="input-textarea"
            ref={inputRef}
            placeholder="Type your message..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!connected}
            rows={1}
          />
          
          <button
            className={cn("send-button", { active: textInput.trim().length > 0 })}
            onClick={handleSubmit}
            disabled={!connected || textInput.trim().length === 0}
            aria-label="Send message"
          >
            <span className="material-symbols-outlined filled">send</span>
          </button>
        </div>
        
        {!connected && (
          <div className="connection-message">
            Start streaming to send messages
          </div>
        )}
      </div>
    </div>
  );
}
