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
import "./logger.scss";
import { Part } from "@google/generative-ai";
import cn from "classnames";
import { ReactNode, useState } from "react";
import { useLoggerStore } from "../../lib/store-logger";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { RiFileCopyLine, RiCheckLine } from "react-icons/ri";
import {
  ClientContentMessage,
  isClientContentMessage,
  isInterrupted,
  isModelTurn,
  isServerContentMessage,
  isToolCallCancellationMessage,
  isToolCallMessage,
  isToolResponseMessage,
  isTurnComplete,
  ModelTurn,
  ServerContentMessage,
  StreamingLog,
  ToolCallCancellationMessage,
  ToolCallMessage,
  ToolResponseMessage,
} from "../../multimodal-live-types";

// Format the timestamp for display
const formatTime = (d: Date) => d.toLocaleTimeString().slice(0, -3);

// Helper component to copy code to clipboard
const CopyButton = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button 
      className="copy-button" 
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      title={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? <RiCheckLine className="icon-success" /> : <RiFileCopyLine />}
    </button>
  );
};

const LogEntry = ({
  log,
  MessageComponent,
}: {
  log: StreamingLog;
  MessageComponent: ({
    message,
  }: {
    message: StreamingLog["message"];
  }) => ReactNode;
}): JSX.Element => {
  const sourceClass = log.type.slice(0, log.type.indexOf("."));
  const isReceive = log.type.includes("receive");
  const isSend = log.type.includes("send");
  
  return (
    <li
      className={cn(
        `log-entry`,
        `source-${sourceClass}`,
        {
          receive: isReceive,
          send: isSend,
        },
      )}
    >
      <div className="log-entry-header">
        <span className="timestamp">{formatTime(log.date)}</span>
        <span className="source-type">{log.type}</span>
        {log.count && <span className="log-count">{log.count}</span>}
      </div>
      <div className="log-entry-content">
        <MessageComponent message={log.message} />
      </div>
    </li>
  );
};

const PlainTextMessage = ({
  message,
}: {
  message: StreamingLog["message"];
}) => (
  <div className="plain-text-message">
    <p>{message as string}</p>
  </div>
);

type Message = { message: StreamingLog["message"] };

const AnyMessage = ({ message }: Message) => {
  const content = JSON.stringify(message, null, 2);
  
  return (
    <div className="any-message">
      <div className="code-block-header">
        <span className="code-language">JSON</span>
        <CopyButton content={content} />
      </div>
      <SyntaxHighlighter language="json" style={atomOneDark} wrapLines={true}>
        {content}
      </SyntaxHighlighter>
    </div>
  );
};

function tryParseCodeExecutionResult(output: string) {
  try {
    const json = JSON.parse(output);
    return JSON.stringify(json, null, 2);
  } catch (e) {
    return output;
  }
}

const RenderPart = ({ part }: { part: Part }) => {
  if (part.text && part.text.length) {
    return <p className="text-part">{part.text}</p>;
  }
  
  if (part.executableCode) {
    const { language, code } = part.executableCode;
    
    return (
      <div className="executable-code-part">
        <div className="code-block-header">
          <span className="code-language">{language}</span>
          <CopyButton content={code} />
        </div>
        <SyntaxHighlighter language={language.toLowerCase()} style={atomOneDark} wrapLines={true}>
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }
  
  if (part.codeExecutionResult) {
    const { outcome, output } = part.codeExecutionResult;
    const parsedOutput = tryParseCodeExecutionResult(output);
    
    return (
      <div className="code-execution-result">
        <div className="code-block-header">
          <span className="code-result-status">{outcome}</span>
          <CopyButton content={parsedOutput} />
        </div>
        <SyntaxHighlighter language="json" style={atomOneDark} wrapLines={true}>
          {parsedOutput}
        </SyntaxHighlighter>
      </div>
    );
  }
  
  if (part.inlineData) {
    return (
      <div className="inline-data-part">
        <div className="inline-data-header">
          <span className="inline-data-type">{part.inlineData.mimeType}</span>
        </div>
        <div className="inline-data-content">
          <span className="inline-data-placeholder">[Inline Data]</span>
        </div>
      </div>
    );
  }
  
  return null;
};

const ClientContentLog = ({ message }: Message) => {
  const { turns, turnComplete } = (message as ClientContentMessage).clientContent;
  
  return (
    <div className="client-content-log user-message">
      <div className="message-header user">
        <span className="role-label">User</span>
        {!turnComplete && <span className="status-label">typing...</span>}
      </div>
      <div className="message-content">
        {turns.map((turn, i) => (
          <div key={`message-turn-${i}`} className="turn">
            {turn.parts
              .filter((part) => !(part.text && part.text === "\n"))
              .map((part, j) => (
                <RenderPart part={part} key={`message-turn-${i}-part-${j}`} />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const ToolCallLog = ({ message }: Message) => {
  const { toolCall } = message as ToolCallMessage;
  
  return (
    <div className="tool-call-log">
      <div className="message-header tool">
        <span className="role-label">Tool Call</span>
      </div>
      <div className="message-content">
        {toolCall.functionCalls.map((fc, i) => {
          const content = JSON.stringify(fc, null, 2);
          
          return (
            <div key={fc.id} className="function-call-part">
              <div className="code-block-header">
                <span className="function-name">{fc.name}</span>
                <CopyButton content={content} />
              </div>
              <SyntaxHighlighter language="json" style={atomOneDark} wrapLines={true}>
                {content}
              </SyntaxHighlighter>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ToolCallCancellationLog = ({ message }: Message): JSX.Element => {
  const ids = (message as ToolCallCancellationMessage).toolCallCancellation.ids;
  
  return (
    <div className="tool-cancellation-log">
      <div className="message-header tool">
        <span className="role-label">Tool Cancellation</span>
      </div>
      <div className="message-content">
        <div className="cancellation-ids">
          <span className="ids-label">Cancelled IDs:</span>
          {ids.map((id) => (
            <code key={`cancel-${id}`} className="id-code">{id}</code>
          ))}
        </div>
      </div>
    </div>
  );
};

const ToolResponseLog = ({ message }: Message): JSX.Element => {
  const responses = (message as ToolResponseMessage).toolResponse.functionResponses;
  
  return (
    <div className="tool-response-log">
      <div className="message-header tool-response">
        <span className="role-label">Tool Response</span>
      </div>
      <div className="message-content">
        {responses.map((fc) => {
          const content = JSON.stringify(fc.response, null, 2);
          
          return (
            <div key={`tool-response-${fc.id}`} className="function-response-part">
              <div className="code-block-header">
                <span className="function-id">{fc.id}</span>
                <CopyButton content={content} />
              </div>
              <SyntaxHighlighter language="json" style={atomOneDark} wrapLines={true}>
                {content}
              </SyntaxHighlighter>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ModelTurnLog = ({ message }: Message): JSX.Element => {
  const serverContent = (message as ServerContentMessage).serverContent;
  const { modelTurn } = serverContent as ModelTurn;
  const { parts } = modelTurn;
  
  return (
    <div className="model-turn-log model-message">
      <div className="message-header model">
        <span className="role-label">Gemini</span>
      </div>
      <div className="message-content">
        {parts
          .filter((part) => !(part.text && part.text === "\n"))
          .map((part, j) => (
            <RenderPart part={part} key={`model-turn-part-${j}`} />
          ))}
      </div>
    </div>
  );
};

const CustomPlainTextLog = (msg: string) => () => <PlainTextMessage message={msg} />;

export type LoggerFilterType = "conversations" | "tools" | "none";

export type LoggerProps = {
  filter: LoggerFilterType;
};

const filters: Record<LoggerFilterType, (log: StreamingLog) => boolean> = {
  tools: (log: StreamingLog) =>
    isToolCallMessage(log.message) ||
    isToolResponseMessage(log.message) ||
    isToolCallCancellationMessage(log.message),
  conversations: (log: StreamingLog) =>
    isClientContentMessage(log.message) || isServerContentMessage(log.message),
  none: () => true,
};

const component = (log: StreamingLog) => {
  if (typeof log.message === "string") {
    return PlainTextMessage;
  }
  
  if (isClientContentMessage(log.message)) {
    return ClientContentLog;
  }
  
  if (isToolCallMessage(log.message)) {
    return ToolCallLog;
  }
  
  if (isToolCallCancellationMessage(log.message)) {
    return ToolCallCancellationLog;
  }
  
  if (isToolResponseMessage(log.message)) {
    return ToolResponseLog;
  }
  
  if (isServerContentMessage(log.message)) {
    const { serverContent } = log.message;
    
    if (isInterrupted(serverContent)) {
      return CustomPlainTextLog("Interrupted");
    }
    
    if (isTurnComplete(serverContent)) {
      return CustomPlainTextLog("Turn Complete");
    }
    
    if (isModelTurn(serverContent)) {
      return ModelTurnLog;
    }
  }
  
  return AnyMessage;
};

export default function Logger({ filter = "none" }: LoggerProps) {
  const { logs } = useLoggerStore();
  const filterFn = filters[filter];
  const filteredLogs = logs.filter(filterFn);
  
  if (filteredLogs.length === 0) {
    return (
      <div className="logger empty-logger">
        <div className="empty-state">
          <p>No logs to display</p>
          <p className="empty-state-hint">
            {filter === "conversations" 
              ? "Start a conversation to see logs here" 
              : filter === "tools" 
                ? "Tool usage logs will appear here" 
                : "Logs will appear here once activity begins"}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="logger">
      <ul className="logger-list">
        {filteredLogs.map((log, key) => (
          <LogEntry MessageComponent={component(log)} log={log} key={key} />
        ))}
      </ul>
    </div>
  );
}
