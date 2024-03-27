import { Box, Button, Container, Paper, Typography } from "@mui/material";
import { Link, useRouteError } from "react-router-dom";

type ErrorType = {
    statusText: string,
    message: string
}

export default function ErrorPage() {
    const error = useRouteError();

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <Container maxWidth="sm">
                <Paper elevation={6} sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h4" component="h1" gutterBottom>Oops!</Typography>
                    <Typography variant="body1" gutterBottom>Sorry, an unexpected error has occurred.</Typography>
                    <Typography variant="body2" component="i">{(error as ErrorType).statusText || (error as ErrorType).message}</Typography>
                    <Box>
                        <Button component={Link} to="/" sx={{ mt: 2 }}>Take me home</Button>
                    </Box>
                </Paper>
            </Container>
        </Box>

    );
}