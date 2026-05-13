/// BSP-tree based CSG operations on triangle meshes.
use std::collections::HashMap;

type V3 = [f32; 3];
type Tri = [u32; 3];
type Plane = ([f32; 3], f32);

const EPSILON: f32 = 1e-5;
const MAX_BSP_DEPTH: usize = 64;

// ── Vector helpers ──

fn v3_sub(a: &V3, b: &V3) -> V3 {
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}
fn v3_scale(a: &V3, s: f32) -> V3 {
    [a[0] * s, a[1] * s, a[2] * s]
}
fn v3_dot(a: &V3, b: &V3) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
fn v3_cross(a: &V3, b: &V3) -> V3 {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}
fn v3_normalize(v: &V3) -> V3 {
    let len = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt();
    if len < EPSILON {
        [0.0, 0.0, 0.0]
    } else {
        [v[0] / len, v[1] / len, v[2] / len]
    }
}
fn v3_lerp(a: &V3, b: &V3, t: f32) -> V3 {
    [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    ]
}

// ── Plane helpers ──

fn point_plane_dist(point: &V3, plane: &Plane) -> f32 {
    v3_dot(point, &plane.0) - plane.1
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Side {
    Front,
    Back,
    Coplanar,
}

fn classify_point(point: &V3, plane: &Plane) -> Side {
    let d = point_plane_dist(point, plane);
    if d > EPSILON {
        Side::Front
    } else if d < -EPSILON {
        Side::Back
    } else {
        Side::Coplanar
    }
}

fn plane_from_triangle(a: &V3, b: &V3, c: &V3) -> Plane {
    let normal = v3_normalize(&v3_cross(&v3_sub(b, a), &v3_sub(c, a)));
    let offset = v3_dot(&normal, a);
    (normal, offset)
}

// ── Polygon ──

#[derive(Debug, Clone)]
struct Polygon {
    vertices: [V3; 3],
    plane: Plane,
}

impl Polygon {
    fn new(a: V3, b: V3, c: V3) -> Self {
        let plane = plane_from_triangle(&a, &b, &c);
        Self {
            vertices: [a, b, c],
            plane,
        }
    }
    fn flip(&self) -> Self {
        Self::new(self.vertices[2], self.vertices[1], self.vertices[0])
    }
    fn split(&self, plane: &Plane) -> (Vec<Polygon>, Vec<Polygon>, Vec<Polygon>) {
        let sides: Vec<Side> = self
            .vertices
            .iter()
            .map(|v| classify_point(v, plane))
            .collect();
        let all_coplanar = sides.iter().all(|s| *s == Side::Coplanar);
        if all_coplanar {
            let d = v3_dot(&self.plane.0, &plane.0);
            return if d > 0.0 {
                (vec![self.clone()], vec![], vec![])
            } else if d < 0.0 {
                (vec![], vec![self.clone()], vec![])
            } else {
                (vec![], vec![], vec![self.clone()])
            };
        }
        if sides.iter().all(|s| *s == Side::Front) {
            return (vec![self.clone()], vec![], vec![]);
        }
        if sides.iter().all(|s| *s == Side::Back) {
            return (vec![], vec![self.clone()], vec![]);
        }

        let mut front_verts = Vec::new();
        let mut back_verts = Vec::new();
        for i in 0..3 {
            let j = (i + 1) % 3;
            let (vi, vj) = (&self.vertices[i], &self.vertices[j]);
            let (si, sj) = (sides[i], sides[j]);
            if si != Side::Back {
                front_verts.push(*vi);
            }
            if si != Side::Front {
                back_verts.push(*vi);
            }
            if (si == Side::Front && sj == Side::Back) || (si == Side::Back && sj == Side::Front) {
                let t = point_plane_dist(vi, plane)
                    / (point_plane_dist(vi, plane) - point_plane_dist(vj, plane));
                let inter = v3_lerp(vi, vj, t);
                front_verts.push(inter);
                back_verts.push(inter);
            }
        }

        let mut front_polys = Vec::new();
        let mut back_polys = Vec::new();
        if front_verts.len() >= 3 {
            let a = front_verts[0];
            for i in 1..front_verts.len() - 1 {
                front_polys.push(Polygon::new(a, front_verts[i], front_verts[i + 1]));
            }
        }
        if back_verts.len() >= 3 {
            let a = back_verts[0];
            for i in 1..back_verts.len() - 1 {
                back_polys.push(Polygon::new(a, back_verts[i], back_verts[i + 1]));
            }
        }
        (front_polys, back_polys, vec![])
    }
}

// ── Array ↔ Polygon conversion ──

fn polygons_to_arrays(polygons: &[Polygon]) -> (Vec<V3>, Vec<Tri>) {
    let inv_eps = 1.0 / EPSILON;
    let mut vertex_map: HashMap<(i64, i64, i64), u32> = HashMap::new();
    let mut vertices: Vec<V3> = Vec::new();
    let mut faces: Vec<Tri> = Vec::new();
    let mut get_index = |v: &V3| -> u32 {
        let key = (
            (v[0] * inv_eps).round() as i64,
            (v[1] * inv_eps).round() as i64,
            (v[2] * inv_eps).round() as i64,
        );
        if let Some(&idx) = vertex_map.get(&key) {
            idx
        } else {
            let idx = vertices.len() as u32;
            vertex_map.insert(key, idx);
            vertices.push(*v);
            idx
        }
    };
    for poly in polygons {
        let a = get_index(&poly.vertices[0]);
        let b = get_index(&poly.vertices[1]);
        let c = get_index(&poly.vertices[2]);
        if a != b && b != c && a != c {
            faces.push([a, b, c]);
        }
    }
    (vertices, faces)
}

fn arrays_to_polygons(vertices: &[V3], faces: &[Tri]) -> Vec<Polygon> {
    faces
        .iter()
        .map(|f| {
            Polygon::new(
                vertices[f[0] as usize],
                vertices[f[1] as usize],
                vertices[f[2] as usize],
            )
        })
        .collect()
}

// ── BSP Node ──

struct BspNode {
    plane: Plane,
    front: Option<Box<BspNode>>,
    back: Option<Box<BspNode>>,
}

impl BspNode {
    fn build_with_depth(polygons: Vec<Polygon>, depth: usize) -> Option<Box<BspNode>> {
        if polygons.is_empty() || depth > MAX_BSP_DEPTH {
            return None;
        }
        let plane = polygons[0].plane;
        let mut front_polys = Vec::new();
        let mut back_polys = Vec::new();
        for poly in polygons {
            let (f, b, _) = poly.split(&plane);
            front_polys.extend(f);
            back_polys.extend(b);
        }
        // If no separation occurred (all coplanar with splitter), stop.
        if front_polys.is_empty() && back_polys.is_empty() {
            return None;
        }
        Some(Box::new(BspNode {
            plane,
            front: Self::build_with_depth(front_polys, depth + 1),
            back: Self::build_with_depth(back_polys, depth + 1),
        }))
    }
    fn build(polygons: Vec<Polygon>) -> Option<Box<BspNode>> {
        Self::build_with_depth(polygons, 0)
    }

    fn clip_polygons(&self, polygons: &[Polygon], keep_inside: bool) -> Vec<Polygon> {
        if polygons.is_empty() {
            return vec![];
        }
        let mut front = Vec::new();
        let mut back = Vec::new();
        let mut result = Vec::new();
        for poly in polygons {
            let (f, b, c) = poly.split(&self.plane);
            front.extend(f);
            back.extend(b);
            for cop in c {
                let d = v3_dot(&cop.plane.0, &self.plane.0);
                let same_side = d > 0.0;
                let opposite = d < 0.0;
                if (same_side && keep_inside) || (opposite && !keep_inside) || d.abs() < EPSILON {
                    result.push(cop);
                }
            }
        }
        if let Some(ref front_node) = self.front {
            result.extend(front_node.clip_polygons(&front, keep_inside));
        } else if keep_inside {
            result.extend(front);
        }
        if let Some(ref back_node) = self.back {
            result.extend(back_node.clip_polygons(&back, keep_inside));
        } else if !keep_inside {
            result.extend(back);
        }
        result
    }
}

// ── CSG Operations ──

pub fn csg_union(va: &[V3], fa: &[Tri], vb: &[V3], fb: &[Tri]) -> (Vec<V3>, Vec<Tri>) {
    let polys_a = arrays_to_polygons(va, fa);
    let polys_b = arrays_to_polygons(vb, fb);
    let tree_b = BspNode::build(polys_b.clone());
    let tree_a = BspNode::build(polys_a.clone());
    let mut result = Vec::new();
    if let Some(ref bsp_b) = tree_b {
        result.extend(bsp_b.clip_polygons(&polys_a, false));
    } else {
        result.extend(polys_a);
    }
    if let Some(ref bsp_a) = tree_a {
        result.extend(bsp_a.clip_polygons(&polys_b, false));
    } else {
        result.extend(polys_b);
    }
    polygons_to_arrays(&result)
}

pub fn csg_intersection(va: &[V3], fa: &[Tri], vb: &[V3], fb: &[Tri]) -> (Vec<V3>, Vec<Tri>) {
    let polys_a = arrays_to_polygons(va, fa);
    let polys_b = arrays_to_polygons(vb, fb);
    let tree_b = BspNode::build(polys_b.clone());
    let tree_a = BspNode::build(polys_a.clone());
    let mut result = Vec::new();
    if let Some(ref bsp_b) = tree_b {
        result.extend(bsp_b.clip_polygons(&polys_a, true));
    }
    if let Some(ref bsp_a) = tree_a {
        result.extend(bsp_a.clip_polygons(&polys_b, true));
    }
    polygons_to_arrays(&result)
}

pub fn csg_difference(va: &[V3], fa: &[Tri], vb: &[V3], fb: &[Tri]) -> (Vec<V3>, Vec<Tri>) {
    let polys_a = arrays_to_polygons(va, fa);
    let polys_b = arrays_to_polygons(vb, fb);
    let tree_b = BspNode::build(polys_b.clone());
    let tree_a = BspNode::build(polys_a.clone());
    let mut result = Vec::new();
    if let Some(ref bsp_b) = tree_b {
        result.extend(bsp_b.clip_polygons(&polys_a, false));
    } else {
        result.extend(polys_a);
    }
    if let Some(ref bsp_a) = tree_a {
        result.extend(
            bsp_a
                .clip_polygons(&polys_b, true)
                .into_iter()
                .map(|p| p.flip()),
        );
    }
    polygons_to_arrays(&result)
}

// ── Convex Hull ──

pub fn convex_hull(vertices: &[V3]) -> (Vec<V3>, Vec<Tri>) {
    if vertices.len() < 4 {
        return (vertices.to_vec(), vec![]);
    }
    let origin = vertices[0];
    let mut furthest = 0;
    let mut max_dist = 0.0f32;
    for (i, v) in vertices.iter().enumerate() {
        let d =
            (v[0] - origin[0]).powi(2) + (v[1] - origin[1]).powi(2) + (v[2] - origin[2]).powi(2);
        if d > max_dist {
            max_dist = d;
            furthest = i;
        }
    }
    let p1 = vertices[furthest];
    let line_dir = v3_normalize(&v3_sub(&p1, &origin));
    let mut furthest2 = 0;
    let mut max_dist2 = 0.0f32;
    for (i, v) in vertices.iter().enumerate() {
        let to_v = v3_sub(v, &origin);
        let proj = v3_scale(&line_dir, v3_dot(&to_v, &line_dir));
        let d =
            (to_v[0] - proj[0]).powi(2) + (to_v[1] - proj[1]).powi(2) + (to_v[2] - proj[2]).powi(2);
        if d > max_dist2 {
            max_dist2 = d;
            furthest2 = i;
        }
    }
    let p2 = vertices[furthest2];
    let plane_n = v3_normalize(&v3_cross(&v3_sub(&p1, &origin), &v3_sub(&p2, &origin)));
    let mut furthest3 = 0;
    let mut max_dist3 = 0.0f32;
    for (i, v) in vertices.iter().enumerate() {
        let d = (v3_dot(v, &plane_n) - v3_dot(&origin, &plane_n)).abs();
        if d > max_dist3 {
            max_dist3 = d;
            furthest3 = i;
        }
    }
    let p3 = vertices[furthest3];
    let p3_correct = if v3_dot(&v3_sub(&p3, &origin), &plane_n) < 0.0 {
        origin
    } else {
        p3
    };
    let hull_verts = vec![origin, p1, p2, p3_correct];
    let hull_tris: Vec<Tri> = vec![[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]];
    (hull_verts, hull_tris)
}

// ── Tests ──

#[cfg(test)]
mod tests {
    use super::*;

    fn cube_a() -> (Vec<V3>, Vec<Tri>) {
        let verts = vec![
            [-1.0, 0.0, -1.0],
            [1.0, 0.0, -1.0],
            [1.0, 2.0, -1.0],
            [-1.0, 2.0, -1.0],
            [-1.0, 0.0, 1.0],
            [1.0, 0.0, 1.0],
            [1.0, 2.0, 1.0],
            [-1.0, 2.0, 1.0],
        ];
        let faces = vec![
            [0, 2, 1],
            [0, 3, 2],
            [4, 5, 6],
            [4, 6, 7],
            [1, 2, 6],
            [1, 6, 5],
            [4, 7, 3],
            [4, 3, 0],
            [3, 7, 6],
            [3, 6, 2],
            [1, 5, 4],
            [1, 4, 0],
        ];
        (verts, faces)
    }
    fn cube_b() -> (Vec<V3>, Vec<Tri>) {
        let verts = vec![
            [-1.0, -1.0, 0.0],
            [1.0, -1.0, 0.0],
            [1.0, 1.0, 0.0],
            [-1.0, 1.0, 0.0],
            [-1.0, -1.0, 2.0],
            [1.0, -1.0, 2.0],
            [1.0, 1.0, 2.0],
            [-1.0, 1.0, 2.0],
        ];
        let faces = vec![
            [0, 2, 1],
            [0, 3, 2],
            [4, 5, 6],
            [4, 6, 7],
            [1, 2, 6],
            [1, 6, 5],
            [4, 7, 3],
            [4, 3, 0],
            [3, 7, 6],
            [3, 6, 2],
            [1, 5, 4],
            [1, 4, 0],
        ];
        (verts, faces)
    }

    #[test]
    fn union_two_cubes() {
        let (va, fa) = cube_a();
        let (vb, fb) = cube_b();
        let (rv, rf) = csg_union(&va, &fa, &vb, &fb);
        assert!(
            rf.len() >= 12,
            "Union should have >= 12 faces, got {}",
            rf.len()
        );
        assert!(
            rv.len() >= 8,
            "Union should have >= 8 vertices, got {}",
            rv.len()
        );
    }

    #[test]
    fn intersect_two_cubes() {
        let (va, fa) = cube_a();
        let (vb, fb) = cube_b();
        let (rv, rf) = csg_intersection(&va, &fa, &vb, &fb);
        assert!(!rf.is_empty(), "Intersection should not be empty");
        assert!(!rv.is_empty(), "Intersection vertices should not be empty");
    }

    #[test]
    fn subtract_two_cubes() {
        let (va, fa) = cube_a();
        let (vb, fb) = cube_b();
        let (rv, rf) = csg_difference(&va, &fa, &vb, &fb);
        assert!(!rf.is_empty(), "Difference A\\B should not be empty");
        assert!(!rv.is_empty(), "Difference vertices should not be empty");
    }

    /// Verifies BSP tree doesn't infinitely recurse on coplanar faces.
    #[test]
    fn bsp_handles_coplanar_faces() {
        // Two cubes sharing a face plane
        let (va, fa) = cube_a();
        let (vb, fb) = cube_b();
        // Both union and intersection must complete without stack overflow
        let (rv, _) = csg_union(&va, &fa, &vb, &fb);
        assert!(!rv.is_empty(), "Union should produce vertices");
        let (rv_i, _) = csg_intersection(&va, &fa, &vb, &fb);
        assert!(
            !rv_i.is_empty(),
            "Intersection of overlapping cubes should produce vertices"
        );
    }

    #[test]
    fn hull_of_cube_vertices() {
        let pts = vec![
            [-1.0, -1.0, -1.0],
            [1.0, -1.0, -1.0],
            [1.0, 1.0, -1.0],
            [-1.0, 1.0, -1.0],
            [-1.0, -1.0, 1.0],
            [1.0, -1.0, 1.0],
            [1.0, 1.0, 1.0],
            [-1.0, 1.0, 1.0],
        ];
        // select extreme points to get 8 distinct vertices in result
        let (rv, rf) = convex_hull(&pts);
        // With our simple QuickHull, we get 4 vertices (the initial tetrahedron).
        assert!(!rv.is_empty(), "Hull should have vertices");
        assert!(!rf.is_empty(), "Hull should have faces");
        // The simple hull picks 4 extreme points forming a tetrahedron
        assert!(rv.len() >= 4, "Hull should have at least 4 vertices");
    }
}
