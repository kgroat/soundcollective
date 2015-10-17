interface MathExt extends Math {
    sinh: (input: number) => number;
}
declare var Math : MathExt;

interface Window {
    soundWorks: any;
}