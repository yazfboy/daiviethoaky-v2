import Link from "next/link";
import { AiNotice } from "@/components/AiNotice";
import { CHARACTERS, type Character } from "@/lib/characters";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-10 sm:px-6 sm:py-14">
      <header className="text-center">
        <p className="text-xs tracking-[0.35em] text-gold uppercase">Hồi ức sử Việt</p>
        <h1 className="font-display mt-2 text-5xl font-bold text-cinnabar sm:text-6xl">Đại Việt Họa Ký</h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-ink-soft sm:text-lg">
          Chọn một bậc danh nhân để ngồi xuống cùng đàm đạo chuyện non sông.
        </p>
        <div className="divider-cloud mx-auto mt-6 w-40" aria-hidden />
      </header>

      <section aria-label="Chọn nhân vật" className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {CHARACTERS.map((c) => (
          <CharacterCard key={c.id} character={c} />
        ))}
      </section>

      <footer className="mt-auto pt-12 text-center">
        <AiNotice />
      </footer>
    </main>
  );
}

function CharacterCard({ character: c }: { character: Character }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden
          className={`seal flex h-14 min-w-14 items-center justify-center px-2 text-xl ${c.available ? "" : "seal-muted"}`}
        >
          {c.seal}
        </span>
        {!c.available && (
          <span className="rounded-full border border-ink-faint/50 bg-paper-deep px-3 py-1 text-xs font-medium whitespace-nowrap text-ink-soft">
            Sắp ra mắt
          </span>
        )}
      </div>
      <h2 className="font-display mt-4 text-2xl font-bold">{c.name}</h2>
      <p className="text-sm text-ink-faint">{c.years}</p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{c.intro}</p>
      <p className={`mt-auto pt-5 text-sm font-medium ${c.available ? "text-cinnabar" : "text-ink-faint"}`}>
        {c.available ? "Vào trò chuyện →" : "Xin hẹn dịp sau"}
      </p>
    </>
  );

  const base = "frame-double flex h-full flex-col rounded-lg bg-scroll p-5";

  if (!c.available) {
    return (
      <div
        aria-disabled="true"
        aria-label={`${c.name}: sắp ra mắt`}
        className={`${base} cursor-not-allowed opacity-70 grayscale-[35%] select-none`}
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/tro-chuyen/${c.id}`}
      aria-label={`Trò chuyện với ${c.name}`}
      className={`${base} transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cinnabar`}
    >
      {body}
    </Link>
  );
}
