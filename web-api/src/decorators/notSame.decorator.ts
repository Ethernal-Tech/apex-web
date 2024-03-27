import {
	ValidationArguments,
	ValidationOptions,
	ValidatorConstraint,
	ValidatorConstraintInterface,
	registerDecorator,
} from 'class-validator';

export function NotSame(
	property: string,
	validationOptions?: ValidationOptions,
) {
	return (object: any, propertyName: string) => {
		registerDecorator({
			target: object.constructor,
			propertyName,
			options: validationOptions,
			constraints: [property],
			validator: NotSameConstraint,
		});
	};
}

@ValidatorConstraint({ name: 'NotSame' })
export class NotSameConstraint implements ValidatorConstraintInterface {
	validate(value: any, args: ValidationArguments) {
		const [relatedPropertyName] = args.constraints;
		const relatedValue = (args.object as any)[relatedPropertyName];
		return value !== relatedValue;
	}

	defaultMessage(args: ValidationArguments) {
		const [relatedPropertyName] = args.constraints;
		return `${relatedPropertyName} and ${args.property} can't be same`;
	}
}
