# Export de maillages depuis l'atlas Z-Anatomy (fichier Blender), sans interface.
#
# Lancé par pipeline/04-z-anatomy.mjs, en deux temps :
#   1. lister :  blender -b Startup.blend --python exporter.py -- lister <sortie.json>
#      → noms de tous les objets maillage (MESH) et courbe (CURVE : nerfs)
#   2. exporter : blender -b Startup.blend --python exporter.py -- exporter <noms.json> <dossier>
#
# Pour chaque objet demandé : géométrie évaluée (modificateurs et épaisseur des
# courbes appliqués), transformée en coordonnées « monde », triangulée, écrite
# en OBJ. bornes.json récapitule les boîtes englobantes (recalage) et les
# objets introuvables.

import bpy
import json
import os
import sys

argv = sys.argv[sys.argv.index('--') + 1:]
mode = argv[0]

if mode == 'lister':
    objets = {o.name: o.type for o in bpy.data.objects if o.type in ('MESH', 'CURVE')}
    json.dump(objets, open(argv[1], 'w', encoding='utf-8'))
    print(f'Z-Anatomy : {len(objets)} objets listés')
    sys.exit(0)

noms = json.load(open(argv[1], encoding='utf-8'))
sortie = argv[2]
os.makedirs(sortie, exist_ok=True)

depsgraph = bpy.context.evaluated_depsgraph_get()
bornes = {}
introuvables = []


def nom_fichier(nom):
    return ''.join(c if c.isalnum() or c in '-_.' else '_' for c in nom) + '.obj'


for nom in noms:
    obj = bpy.data.objects.get(nom)
    if obj is None or obj.type not in ('MESH', 'CURVE'):  # les nerfs sont des courbes
        introuvables.append(nom)
        continue
    ev = obj.evaluated_get(depsgraph)
    try:
        mesh = ev.to_mesh()
    except RuntimeError:
        introuvables.append(nom)
        continue
    if mesh is None or len(mesh.polygons) == 0:
        introuvables.append(nom)
        ev.to_mesh_clear()
        continue
    mesh.calc_loop_triangles()
    mw = obj.matrix_world
    verts = [mw @ v.co for v in mesh.vertices]
    # Les objets du côté gauche sont souvent des copies en miroir (échelle
    # négative) : la transformation inverse alors l'ordre des sommets des faces,
    # ce qui retournerait les normales. On rétablit l'ordre dans ce cas.
    miroir = mw.determinant() < 0
    with open(os.path.join(sortie, nom_fichier(nom)), 'w', encoding='utf-8') as f:
        f.write(f'# Z-Anatomy (CC BY-SA 4.0) : {nom}\n')
        for v in verts:
            f.write(f'v {v.x:.6f} {v.y:.6f} {v.z:.6f}\n')
        for t in mesh.loop_triangles:
            a, b, c = t.vertices
            if miroir:
                b, c = c, b
            f.write(f'f {a + 1} {b + 1} {c + 1}\n')
    xs = [v.x for v in verts]; ys = [v.y for v in verts]; zs = [v.z for v in verts]
    bornes[nom] = {
        'fichier': nom_fichier(nom),
        'type': obj.type,
        'min': [min(xs), min(ys), min(zs)],
        'max': [max(xs), max(ys), max(zs)],
        'sommets': len(verts),
        'triangles': len(mesh.loop_triangles),
    }
    ev.to_mesh_clear()

json.dump({'bornes': bornes, 'introuvables': introuvables}, open(os.path.join(sortie, 'bornes.json'), 'w', encoding='utf-8'), indent=1)
print(f'Export Z-Anatomy : {len(bornes)} objets, {len(introuvables)} introuvables')
