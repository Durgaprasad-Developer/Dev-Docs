// CSS module type declarations
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Allow CSS side-effect imports
declare module '*.css' {
  interface CSSModule {
    [key: string]: string;
  }
  const styles: CSSModule;
  export default styles;
}
