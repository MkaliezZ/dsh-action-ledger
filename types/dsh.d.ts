declare module '@deepseek-ai/cordis' {
  export interface Context {
    commands: { register(definition: { name: string; description: string; recordInput?: boolean; handler(invocation: any): any }): () => void }
  }
}
