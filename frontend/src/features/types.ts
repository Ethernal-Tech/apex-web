export type StepType = {
	label: string;
	status: 'success' | 'pending' | 'rejected';
	active: boolean;
};
