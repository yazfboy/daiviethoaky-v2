import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatScreen } from "@/components/ChatScreen";
import { getCharacter } from "@/lib/characters";

export default async function ChatPage({ params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const character = getCharacter(characterId);
  if (!character) notFound();

  if (!character.available) {
    // Vào thẳng bằng URL nhân vật chưa mở: báo "Sắp ra mắt", không cho chat.
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 text-center">
        <span className="seal seal-muted flex h-16 min-w-16 items-center justify-center px-2 text-2xl" aria-hidden>
          {character.seal}
        </span>
        <h1 className="font-display mt-4 text-3xl font-bold">{character.name}</h1>
        <p className="mt-2 text-lg text-ink-soft">Sắp ra mắt</p>
        <Link href="/" className="mt-6 text-cinnabar underline underline-offset-4">
          ← Về chọn nhân vật
        </Link>
      </main>
    );
  }

  // key: đổi nhân vật thì dựng lại màn chat từ đầu, không để lịch sử nhân vật này lọt sang nhân vật kia.
  return <ChatScreen key={character.id} character={character} />;
}
