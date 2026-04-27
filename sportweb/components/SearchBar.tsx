type Props = {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
};

export default function SearchBar({ search, setSearch }: Props) {
  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="팀명 또는 리그 검색"
      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none md:w-80"
    />
  );
}