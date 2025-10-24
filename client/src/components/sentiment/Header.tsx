const Header = () => {
  return (
    <header className="w-full max-w-4xl text-center mb-10">
      <h1 className="text-4xl sm:text-5xl font-bold text-blue-400 [text-shadow:0_2px_12px_rgb(59_130_246/0.5)]">
        Sentiment Analysis Project
      </h1>
      <p className="text-lg text-slate-400 mt-3">
        Analyze sentiment from a .CSV file or a single piece of text.
      </p>
    </header>
  );
};

export default Header;
