import React from "react";
import Markdown from "react-markdown";

export function strToJsx(str: string): JSX.Element {
  return (
    <Markdown>
      {str}
    </Markdown>
  );
}