//! HID packet encoding for Corsair Elite LCD screens.

pub const HEADER_SIZE: usize = 8;
pub const MAX_PACKET_LEN: usize = 1024;
pub const OPCODE_IMAGE: u8 = 0x02;
/// Image bytes carried per HID packet; each packet is the 8-byte header plus this
/// payload, zero-padded to `MAX_PACKET_LEN`.
pub const PACKET_PAYLOAD_LEN: usize = MAX_PACKET_LEN - HEADER_SIZE;

/// Encode one image chunk into `buf` as a full HID packet (header + payload, zero-padded
/// to `MAX_PACKET_LEN`).
///
/// `buf` must be at least `MAX_PACKET_LEN` long and `chunk` at most `PACKET_PAYLOAD_LEN`.
/// Writing in place lets the render loop reuse a single buffer across every chunk and
/// frame instead of allocating a `Vec` per packet on the hot path.
pub fn encode_packet(buf: &mut [u8], opcode: u8, part_num: u16, is_end: bool, chunk: &[u8]) {
    debug_assert!(buf.len() >= MAX_PACKET_LEN);
    debug_assert!(chunk.len() <= PACKET_PAYLOAD_LEN);

    buf[0] = opcode;
    buf[1] = 0x05;
    buf[2] = 0x40;
    buf[3] = u8::from(is_end);
    buf[4..6].copy_from_slice(&part_num.to_le_bytes());
    buf[6..8].copy_from_slice(&(chunk.len() as u16).to_le_bytes());
    buf[HEADER_SIZE..HEADER_SIZE + chunk.len()].copy_from_slice(chunk);
    buf[HEADER_SIZE + chunk.len()..MAX_PACKET_LEN].fill(0);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn single_chunk_packet_has_end_flag() {
        let mut buf = [0xAAu8; MAX_PACKET_LEN];
        encode_packet(&mut buf, OPCODE_IMAGE, 0, true, b"hello");
        assert_eq!(buf[0], OPCODE_IMAGE);
        assert_eq!(buf[3], 1); // is_end
        assert_eq!(u16::from_le_bytes([buf[4], buf[5]]), 0); // part_num
        assert_eq!(u16::from_le_bytes([buf[6], buf[7]]), 5); // datalen
        assert_eq!(&buf[HEADER_SIZE..HEADER_SIZE + 5], b"hello");
        assert_eq!(buf[HEADER_SIZE + 5], 0); // tail zero-padded
        assert_eq!(buf[MAX_PACKET_LEN - 1], 0);
    }

    #[test]
    fn command_header_bytes() {
        let mut buf = [0u8; MAX_PACKET_LEN];
        encode_packet(&mut buf, OPCODE_IMAGE, 1, false, &[0xFF, 0xD8]);
        assert_eq!(buf[0], 0x02);
        assert_eq!(buf[1], 0x05);
        assert_eq!(buf[2], 0x40);
        assert_eq!(buf[3], 0); // not end
        assert_eq!(u16::from_le_bytes([buf[4], buf[5]]), 1);
    }
}
