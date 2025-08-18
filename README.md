# TODOs

## Globals watching
When changing a global value (grain?) - re-evaluate the module? (It might be done even if some exports are not functionals, as global values can be generated on module load)

eg:

const s = sphere(...)	//<- here, the grain was already used

export default ()=> {
	return f(x, s)
}

## Boolean3d
try https://github.com/timschmidt/csgrs
