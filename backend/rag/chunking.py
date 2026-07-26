import re
from dataclasses import dataclass


@dataclass
class Chunk:
    chunk_id: str
    text: str
    document_id: str
    page_number: int
    char_offset: int
    char_count: int


def split_sentences(text: str) -> list[str]:
    """Split text into sentences using regex."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


def chunk_text(
    text: str,
    document_id: str,
    page_number: int = 1,
    chunk_size: int = 512,
    chunk_overlap: int = 64,
) -> list[Chunk]:
    """Split text into overlapping chunks, respecting sentence boundaries."""
    sentences = split_sentences(text)
    chunks = []
    current_chunk = []
    current_len = 0
    chunk_idx = 0

    for sentence in sentences:
        sent_len = len(sentence)

        if current_len + sent_len > chunk_size and current_chunk:
            chunk_text_str = " ".join(current_chunk)
            chunks.append(Chunk(
                chunk_id=f"{document_id}_p{page_number}_c{chunk_idx}",
                text=chunk_text_str,
                document_id=document_id,
                page_number=page_number,
                char_offset=0,
                char_count=len(chunk_text_str),
            ))
            chunk_idx += 1

            overlap_text = chunk_text_str[-chunk_overlap:] if chunk_overlap > 0 else ""
            current_chunk = [overlap_text, sentence] if overlap_text else [sentence]
            current_len = len(overlap_text) + sent_len
        else:
            current_chunk.append(sentence)
            current_len += sent_len

    if current_chunk:
        chunk_text_str = " ".join(current_chunk)
        chunks.append(Chunk(
            chunk_id=f"{document_id}_p{page_number}_c{chunk_idx}",
            text=chunk_text_str,
            document_id=document_id,
            page_number=page_number,
            char_offset=0,
            char_count=len(chunk_text_str),
        ))

    return chunks


def chunk_document(extraction_result: dict, chunk_size: int = 512, chunk_overlap: int = 64) -> list[Chunk]:
    """Chunk all pages from an extraction result."""
    doc_id = extraction_result.get("document_id", "unknown")
    all_chunks = []

    for page in extraction_result.get("pages", []):
        page_chunks = chunk_text(
            text=page["text"],
            document_id=doc_id,
            page_number=page["page_number"],
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
        all_chunks.extend(page_chunks)

    return all_chunks
