// Explains the emotion "Score" column for anyone seeing it for the first
// time. The score is EmotionCheckin.compositeScore: the average of the
// child's and the teacher's emoji, on a 1-5 scale.
export default function ScoreNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-gray-500 ${className}`}>
      <span className="font-medium text-gray-600">Score</span> is the average
      of how the child said they felt and how their teacher saw them, from{" "}
      <span className="whitespace-nowrap">1 = very sad 😢</span> to{" "}
      <span className="whitespace-nowrap">5 = very happy 😄</span>.
    </p>
  );
}
