export function SearchBar({ value, onChange }: { value: string; onChange(v: string): void }) {
  return (
    <div className="searchbar">
      <input
        type="search"
        placeholder="Search channels…"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Search channels"
      />
    </div>
  )
}
