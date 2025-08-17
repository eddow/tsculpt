import { type Decimal, Vector3, op3, v3 } from '@tsculpt'
import { box, sphere } from '@tsculpt'

export default function scene({ radius = 5 as Decimal<1, 100>, center = v3(0, 0, 0) }) {
	const s1 = sphere({ radius, center })
	const b1 = box({ radius: radius * 0.8, center })

	// Apply transformations using method chaining (these are deferred until vertices are accessed)
	const transformedSphere = s1
		.rotateZ(Math.PI / 4) // Rotate 45 degrees around Z
		.scale(0.5) // Scale down
		.translate(v3(radius * 2, 0, 0)) // Move to the right

	// Create another transformed sphere using the new rotate function
	const anotherSphere = s1
		.translate(v3(-radius * 2, 0, 0)) // Move to the left
		.scale(v3(1, 0.5, 1)) // Scale only in Y
		.rotate(v3(1, 0, 0), Math.PI / 6) // Rotate around X axis (equivalent to rotateX)

	// Create a third sphere with arbitrary axis rotation
	const thirdSphere = s1
		.translate(v3(0, radius * 2, 0)) // Move up
		.rotate(v3(1, 1, 0), Math.PI / 3) // Rotate around diagonal axis
		.scale(0.7) // Scale down

	// Combine all meshes using hull operation
	const combined = op3.hull(b1, transformedSphere, anotherSphere, thirdSphere)

	return combined
}
