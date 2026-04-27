import { SportType } from "@/types/game";

type Props = {
  selectedSport: SportType;
  setSelectedSport: React.Dispatch<React.SetStateAction<SportType>>;
};

export default function SportTabs({
  selectedSport,
  setSelectedSport,
}: Props) {
  const sports: SportType[] = ["축구", "야구", "농구", "미식축구"];

  return (
    <div className="flex flex-wrap gap-2">
      {sports.map((sport) => (
        <button
          key={sport}
          type="button"
          onClick={() => setSelectedSport(sport)}
          className={`rounded-2xl px-5 py-2 text-sm font-semibold shadow-sm transition ${
            selectedSport === sport
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {sport}
        </button>
      ))}
    </div>
  );
}