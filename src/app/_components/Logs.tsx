import React, { useEffect, useRef, useState } from "react";
import { useLogsAtomValue } from "../_atoms/logs.atom";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

const Logs = () => {
  const logs = useLogsAtomValue();
  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    if (logsContainerRef.current) {
      const container = logsContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [logs]);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setShowLogs((prev) => !prev);
        }}
      >
        {showLogs ? "Hide Logs" : "Show Logs"}
      </Button>
      {showLogs && (
        <div
          ref={logsContainerRef}
          className="fixed bottom-2 right-2 z-50 h-72 w-[600px] overflow-y-scroll border-2 border-zinc-950 bg-zinc-600 p-2 text-right text-white"
        >
          {logs.map(({ message, type }, index) => (
            <p
              className={cn(
                type === "success"
                  ? "text-emerald-500"
                  : type === "error"
                    ? "text-rose-500"
                    : type === "warning"
                      ? "text-yellow-500"
                      : "text-white",
                "mb-2",
              )}
              key={index}
            >
              {message}
            </p>
          ))}
        </div>
      )}
    </>
  );
};

export default Logs;
