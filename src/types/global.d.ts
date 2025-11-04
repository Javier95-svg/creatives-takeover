export {};

declare global {
  interface Window {
    // Collaboration channel set by CollaborationContext; refine the type as needed later.
    collaborationChannel?: any;
  }
}
