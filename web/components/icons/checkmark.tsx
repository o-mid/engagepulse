import type { SVGProps } from "react";

export function CheckmarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" {...props}>
      <path fill="currentColor" d="m13 24l-9-9l1.414-1.414L13 21.171L26.586 7.586L28 9z"/>
    </svg>
  );
}
