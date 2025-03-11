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
import { RiSidebarFoldLine, RiSidebarUnfoldLine } from "react-icons/ri";
import Select from "react-select";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useLoggerStore } from "../../lib/store-logger";
import Logger, { LoggerFilterType } from "../logger/Logger";
import "./side-panel.scss";
import { motion, AnimatePresence } from "framer-motion";
import { slideInFromSide } from "../../animations";

const filterOptions = [
  { value: "conversations", label: "Conversations" },
  { value: "tools", label: "Tool Use" },
  { value: "none", label: "All" },
];

const panelVariants = {
  open: {
    width: "400px",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    }
  },
  closed: {
    width: "40px",
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 40,
    }
  }
};

const contentVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      delay: 0.2,
      duration: 0.3,
    }
  }
};

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
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  //scroll the log to the bottom when new logs come in
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

  // listen for log events and store them
  useEffect(() => {
    client.on("log", log);
    return () => {
      client.off("log", log);
    };
  }, [client, log]);

  const handleSubmit = () => {
    if (!textInput.trim()) return;
    
    client.send([{ text: textInput }]);
    setTextInput("");
    if (inputRef.current) {
      inputRef.current.innerText = "";
    }
  };

  return (
    <motion.div 
      className={`side-panel`}
      variants={panelVariants}
      animate={open ? "open" : "closed"}
      initial="closed"
    >
      <header className="top">
        <AnimatePresence>
          {open && (
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              Vemini
            </motion.h2>
          )}
        </AnimatePresence>
        <motion.button 
          className="opener"
          onClick={() => setOpen(!open)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {open ? (
            <RiSidebarFoldLine color="#b4b8bb" />
          ) : (
            <RiSidebarUnfoldLine color="#b4b8bb" />
          )}
        </motion.button>
      </header>

      <AnimatePresence>
        {open && (
          <motion.section 
            className="indicators"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <Select
              className="react-select"
              classNamePrefix="react-select"
              styles={{
                control: (baseStyles) => ({
                  ...baseStyles,
                  background: "var(--Neutral-15)",
                  color: "var(--Neutral-90)",
                  minHeight: "33px",
                  maxHeight: "33px",
                  border: 0,
                }),
                option: (styles, { isFocused, isSelected }) => ({
                  ...styles,
                  backgroundColor: isFocused
                    ? "var(--Neutral-30)"
                    : isSelected
                      ? "var(--Neutral-20)"
                      : undefined,
                }),
              }}
              defaultValue={selectedOption}
              placeholder="Filter logs..."
              options={filterOptions}
              onChange={(e) => {
                setSelectedOption(e);
              }}
            />
            
            <motion.div 
              className={cn("streaming-indicator", { connected })}
              initial={{ width: "30px" }}
              animate={{ width: open ? "136px" : "30px" }}
              transition={{ duration: 0.3 }}
            >
              {connected
                ? <span>🔵{open ? " Streaming" : ""}</span>
                : <span>⏸️{open ? " Paused" : ""}</span>}
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div 
            className="side-panel-container" 
            ref={loggerRef}
            variants={slideInFromSide}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Logger
              filter={(selectedOption?.value as LoggerFilterType) || "none"}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div 
            className={cn("input-container", { disabled: !connected })}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="input-content">
              <textarea
                className="input-area"
                ref={inputRef}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit();
                  }
                }}
                onChange={(e) => setTextInput(e.target.value)}
                value={textInput}
                placeholder="Type something..."
              ></textarea>
              
              <motion.button
                className="send-button material-symbols-outlined filled"
                onClick={handleSubmit}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={!textInput.trim()}
              >
                send
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
