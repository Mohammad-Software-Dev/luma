import bpy,math,sys
from mathutils import Vector
source, destination = sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.open_mainfile(filepath=source,use_scripts=False)
for o in list(bpy.data.objects):
 if o.name not in ['Rabbit','Fur','Armature']:bpy.data.objects.remove(o,do_unlink=True)
for o in bpy.context.scene.objects:
 if o.type=='MESH':print('MESH',o.name,len(o.data.polygons),o.dimensions[:],[(m.name if m else None) for m in o.data.materials],flush=True)
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 mat=bpy.data.materials.new(o.name+'_PBR');mat.use_nodes=True
 bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.93
 tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.get('Fur-skin' if o.name=='Fur' else 'rabbot-skinn');mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
 if o.name=='Fur':
  mat.node_tree.links.new(tex.outputs['Alpha'],bsdf.inputs['Alpha']);mat.surface_render_method='DITHERED'
 else:
  norm=mat.node_tree.nodes.new('ShaderNodeTexImage');norm.image=bpy.data.images.get('rabbit-NORM');norm.image.colorspace_settings.name='Non-Color';n=mat.node_tree.nodes.new('ShaderNodeNormalMap');mat.node_tree.links.new(norm.outputs['Color'],n.inputs['Color']);mat.node_tree.links.new(n.outputs['Normal'],bsdf.inputs['Normal'])
 o.data.materials.clear();o.data.materials.append(mat)
arm=bpy.data.objects['Armature'];arm.animation_data.action=bpy.data.actions.get('Guarding')
bpy.context.scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=destination,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_image_format='AUTO',export_anim_single_armature=True)
