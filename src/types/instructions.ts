export interface InstructionTemplate {
  name: string;
  description: string;
  content: string;
}

export interface InstructionCreateOptions {
  name: string;
  content: string;
  description?: string;
}

export interface GlobalInstructions {
  content: string;
  lastModified: Date;
}
