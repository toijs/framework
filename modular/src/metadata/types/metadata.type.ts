export type MetadataListener = (data: MetadataListenerResponse) => void;
export type MetadataListenerResponse = Record<string, unknown>;