export type ParagraphBlock = {
  text: string;
  isContinuation: boolean;
};

export type TocEntry = {
  title: string;
  targetPageIndex: number;
  targetPageNumber: number;
};

export type AssetPair = {
  id: string;
  title: string;
  paragraphs: string[];
  imageUrl?: string;
};

export type LoadedResources = {
  backCoverImageUrl?: string;
  items: AssetPair[];
};

export type CoverPageContent = {
  kind: "cover";
};

export type BackCoverPageContent = {
  kind: "back-cover";
  imageUrl: string;
};

export type BlankPageContent = {
  kind: "blank";
};

export type TocPageContent = {
  kind: "toc";
  title?: string;
  entries: TocEntry[];
};

export type TextPageContent = {
  kind: "text";
  sourceId?: string;
  title?: string;
  paragraphs: ParagraphBlock[];
};

export type ImagePageContent = {
  kind: "image";
  sourceId?: string;
  title?: string;
  paragraphs: ParagraphBlock[];
  imageUrl: string;
  imageOnly: boolean;
};

export type PageContent =
  | CoverPageContent
  | BackCoverPageContent
  | BlankPageContent
  | TocPageContent
  | TextPageContent
  | ImagePageContent;
