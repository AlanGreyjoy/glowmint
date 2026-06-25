//! HID packet encoding for Corsair Elite LCD screens.

pub const HEADER_SIZE: usize = 8;
pub const MAX_PACKET_LEN: usize = 1024;
pub const OPCODE_IMAGE: u8 = 0x02;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CorsairCommand {
    pub opcode: u8,
    pub unknown1: u8,
    pub unknown2: u8,
    pub is_end: bool,
    pub part_num: u16,
    pub datalen: u16,
    pub data: Vec<u8>,
}

impl CorsairCommand {
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(HEADER_SIZE + self.data.len());
        buf.push(self.opcode);
        buf.push(self.unknown1);
        buf.push(self.unknown2);
        buf.push(u8::from(self.is_end));
        buf.extend_from_slice(&self.part_num.to_le_bytes());
        buf.extend_from_slice(&self.datalen.to_le_bytes());
        buf.extend_from_slice(&self.data);
        buf
    }
}

pub fn make_commands(data: &[u8], opcode: u8, max_len: usize) -> Vec<CorsairCommand> {
    let real_max_len = max_len - HEADER_SIZE;
    let mut remaining = data;
    let mut part_num: u16 = 0;
    let mut commands = Vec::new();

    while !remaining.is_empty() {
        let datalen = remaining.len().min(real_max_len);
        let chunk = &remaining[..datalen];
        remaining = &remaining[datalen..];

        let mut padded = chunk.to_vec();
        if padded.len() < real_max_len {
            padded.resize(real_max_len, 0);
        }

        commands.push(CorsairCommand {
            opcode,
            unknown1: 0x05,
            unknown2: 0x40,
            is_end: remaining.is_empty(),
            part_num,
            datalen: datalen as u16,
            data: padded,
        });
        part_num = part_num.saturating_add(1);
    }

    commands
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn single_chunk_command_has_end_flag() {
        let cmds = make_commands(b"hello", OPCODE_IMAGE, MAX_PACKET_LEN);
        assert_eq!(cmds.len(), 1);
        assert!(cmds[0].is_end);
        assert_eq!(cmds[0].part_num, 0);
    }

    #[test]
    fn command_header_bytes() {
        let cmds = make_commands(&[0xFF, 0xD8], OPCODE_IMAGE, MAX_PACKET_LEN);
        let bytes = cmds[0].to_bytes();
        assert_eq!(bytes[0], 0x02);
        assert_eq!(bytes[1], 0x05);
        assert_eq!(bytes[2], 0x40);
        assert_eq!(bytes[3], 1);
    }
}
