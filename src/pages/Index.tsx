
import TacBoard from "@/components/TacBoard";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f3eddc] via-[#e7d3aa] to-[#b6ac99] p-0">
      <h1 className="text-3xl md:text-4xl font-bold text-center mt-10 mb-8 text-[#665038] drop-shadow">
        Tac Online Board
      </h1>
      <TacBoard />
      <div className="mt-10 pb-10 px-6 text-center text-gray-700 font-light text-base max-w-xl">
        <span className="italic text-[#73614f]">Inspired by the real Tac table board. For your custom rules or sessions, just play!</span>
      </div>
    </div>
  );
};

export default Index;
