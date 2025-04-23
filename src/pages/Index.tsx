
import TacBoard from "@/components/TacBoard";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f3eddc] via-[#e7d3aa] to-[#b6ac99] p-4">
      <h1 className="text-3xl md:text-4xl font-bold text-center mt-6 mb-8 text-[#665038] drop-shadow">
        Tac Online Board
      </h1>
      <div className="flex-1 flex flex-col items-center">
        <TacBoard />
      </div>
      <div className="mt-10 pb-6 px-6 text-center text-gray-700 font-light text-base max-w-xl mx-auto">
        <span className="italic text-[#73614f]">
          Inspired by the real Tac table board. Share the game link with friends to play together!
        </span>
      </div>
    </div>
  );
};

export default Index;
