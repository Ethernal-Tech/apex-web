import { Typography, Box, TextField, Button } from "@mui/material";

const amountStyle = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "#191919",
    "& fieldset": {
      border: "none",
      borderTop: "1px solid #0B5855",
      borderLeft: "1px solid #0B5855",
    },
    "&:hover fieldset": {
      border: "none",
      borderTop: "1px solid #0B5855",
      borderLeft: "1px solid #0B5855",
    },
    "&.Mui-focused fieldset": {
      border: "none",
      borderTop: "1px solid #0B5855",
      borderLeft: "1px solid #0B5855",
    },
    "& .MuiInputBase-input::placeholder": {
      color: "white",
      textAlign: "center",
      paddingTop: "28px",
      opacity: 1,
    },
    border: "none",
    borderRadius: "0px",
    color: "white",
    fontSize: "20px",
    "@media (max-width: 768px)": {
      fontSize: "16px",
    }
  },
};

const ConnectSection = () => (
  <Box className="connect-section">
    <Box className="connect-content">
      <Typography className="connect-title">Let’s Connect</Typography>
      <Box className="connect-text">
        <Typography className="connect-description">
          Have questions or want to collaborate?
        </Typography>
        <Typography className="connect-description">
          Reach out to the Skyline team and explore endless possibilities for
          cross-chain growth.
        </Typography>
      </Box>
      <Box className="connect-form">
        <TextField
          sx={amountStyle}
          name="name"
          type="text"
          variant="outlined"
          placeholder="Name"
        />
        <TextField
          sx={amountStyle}
          name="email"
          type="email"
          variant="outlined"
          placeholder="Email address"
        />
        <TextField
          sx={amountStyle}
          name="message"
          type="text"
          variant="outlined"
          placeholder="Message"
          multiline
          rows={3}
        />
        <Button className="connect-button" variant="contained">
          Submit
        </Button>
      </Box>
    </Box>
  </Box>
);

export default ConnectSection;
