declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "hr" | "employee";
      };
    }
  }
}

export {};
