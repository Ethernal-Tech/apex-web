import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import { StepType } from '../../features/types';

type VerticalStepperProps = {
	steps: StepType[];
};

export default function VerticalStepper({ steps }: VerticalStepperProps) {
	const isStepFailed = (step: StepType) => {
		return step.status === 'rejected';
	};

	const getActiveIndex = () => {
		const indexOfActiveStep = steps.findIndex((step) => step.active);
		return indexOfActiveStep === -1 ? steps.length : indexOfActiveStep;
	};

	return (
		<Box sx={{ width: '100%' }}>
			<Stepper activeStep={getActiveIndex()} orientation="vertical">
				{steps.map((step, _) => {
					const labelProps: {
						optional?: React.ReactNode;
						error?: boolean;
					} = {};
					if (isStepFailed(step)) {
						labelProps.optional = (
							<Typography variant="caption" color="error">
								Alert message
							</Typography>
						);
						labelProps.error = true;
					}

					return (
						<Step key={step.label}>
							<StepLabel {...labelProps}>{step.label}</StepLabel>
						</Step>
					);
				})}
			</Stepper>
		</Box>
	);
}
