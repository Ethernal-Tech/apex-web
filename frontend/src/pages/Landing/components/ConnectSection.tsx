import { Typography, Box, TextField, Button } from "@mui/material";
import { ChangeEvent, forwardRef, useState } from "react";
import { submitContactFormAction } from "../../../actions/contact";
import { CreateContactDto } from "../../../swagger/apexBridgeApiService";

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
    },
  },
};

const ConnectSection = forwardRef<HTMLDivElement, {}>((_, ref) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {
      name: "",
      email: "",
      message: "",
    };
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = "Name is required.";
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
      isValid = false;
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    await submitContactFormAction(formData as CreateContactDto);
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <Box component="div" className="connect-section" ref={ref}>
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
            value={formData.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
          />
          <TextField
            sx={amountStyle}
            name="email"
            type="email"
            variant="outlined"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email}
          />
          <TextField
            sx={amountStyle}
            name="message"
            type="text"
            variant="outlined"
            placeholder="Message"
            multiline
            rows={3}
            value={formData.message}
            onChange={handleChange}
            error={!!errors.message}
            helperText={errors.message}
          />
          <Button
            className="connect-button"
            variant="contained"
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </Box>
      </Box>
    </Box>
  );
});

export default ConnectSection;
