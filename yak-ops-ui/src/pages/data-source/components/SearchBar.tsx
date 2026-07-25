import {useIntl} from "@umijs/max";
import React, {useEffect, useRef, useState} from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({value, onChange}) => {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  return (
    <div className="datasource-search-bar" ref={wrapperRef}>
      {/* <Input
        size="large"
        allowClear
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={intl.formatMessage({
          id: 'pages.datasource.search.placeholder',
          defaultMessage: 'Search by datasource name...',
        })}
        className="datasource-search-input"
      /> */}
      <div
        className="rounded-full border transition-all duration-300"
        style={{
          background: "#fff",
          borderColor: open ? "#3b82f6" : "#d1d5db",
          boxShadow: open
            ? "0 0 0 3px rgba(59,130,246,0.10)"
            : "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        <div className="relative rounded-full">
          <input
            className="flex w-full bg-background px-4 py-1.5 pl-9 pr-9 text-sm h-9 rounded-full focus-visible:outline-none"
            placeholder="Search by datasource name"
            type="text"
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              onChange(e.target.value);
              if (!open) setOpen(true);
            }}
            style={{
              border: "none",
              boxShadow: "none",
              background: "transparent",
            }}
          />

          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
