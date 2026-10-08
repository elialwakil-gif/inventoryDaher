import ClickSpark from "./ReactPits/Clic.kSpark.tsx";

export default function ScreenWrapper({ title, children }: any) {
  return (
    <div className="">
      {/* المحتوى فوق الخلفية */}
      <div className="relative z-10">
        {title && (
            <h2 className="text-3xl md:text-4xl font-extrabold text-white font-Orbitron text-center">
            {title}
          </h2>
        )}
        <ClickSpark
          sparkColor='#22aa5560'
          sparkSize={10}
          sparkRadius={15}
          sparkCount={8}
          duration={400}
          >
          <div className="animate-fade-in text-white">
            {children}
          </div>
        </ClickSpark>
      </div>
    </div>
  );
}
