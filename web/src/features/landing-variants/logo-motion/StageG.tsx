"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { BufferGeometry, Float32BufferAttribute, CatmullRomCurve3, Vector3, DoubleSide, BackSide, CanvasTexture, type Mesh, type Group } from "three";
import { rollGeometry, textureRepeat } from "@/features/mockup3d/lib/geometry";
import { CartonBox } from "@/features/mockup3d/components/CartonBox";
import { DrinkCup } from "@/features/mockup3d/components/DrinkCup";
import { useStripTexture } from "@/features/mockup3d/components/use-strip-texture";
import { installThreeConsoleFilter } from "@/features/mockup3d/lib/three-console";
installThreeConsoleFilter();

export type View = "roll" | "carton" | "cup";
type Props = { source: HTMLCanvasElement | null; version: number; color: string; paused: boolean; view?: View; hero?: boolean; angle?: number };
const preset = { width_mm: 48, length_m: 180, thickness_mic: 45 };

function StudioRoll({source,version,color}:Pick<Props,"source"|"version"|"color">){
  const g=rollGeometry(preset);
  const texture=useStripTexture(source,version,textureRepeat(g.circumferenceMm,220));
  const grain=useMemo(()=>{
    const c=document.createElement("canvas");c.width=256;c.height=256;const ctx=c.getContext("2d")!;
    const pixels=ctx.createImageData(256,256);let seed=571;
    for(let i=0;i<pixels.data.length;i+=4){seed=(seed*16807)%2147483647;const n=155+seed%65;pixels.data[i]=n;pixels.data[i+1]=n;pixels.data[i+2]=n;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);
    return new CanvasTexture(c);
  },[]);
  useEffect(()=>()=>grain.dispose(),[grain]);
  return <group>
    <mesh><cylinderGeometry args={[g.outerRadius,g.outerRadius,g.width,192,1,true]}/><meshPhysicalMaterial map={texture??undefined} color={texture?"white":color} roughness={.2} metalness={.02} clearcoat={1} clearcoatRoughness={.13}/></mesh>
    <mesh><cylinderGeometry args={[g.innerRadius,g.innerRadius,g.width*1.01,128,1,true]}/><meshStandardMaterial color="#9f724d" roughness={.95} bumpMap={grain} bumpScale={.014} side={BackSide}/></mesh>
    {[-1,1].map(sign=><group key={sign} position={[0,sign*g.width/2,0]} rotation={[sign>0?-Math.PI/2:Math.PI/2,0,0]}>
      <mesh><ringGeometry args={[g.coreOuterRadius,g.outerRadius,192]}/><meshPhysicalMaterial color={color} roughness={.38} clearcoat={.3} side={DoubleSide}/></mesh>
      <mesh position={[0,0,.001]}><ringGeometry args={[g.innerRadius,g.coreOuterRadius,192]}/><meshStandardMaterial color="#b78c63" roughness={.95} bumpMap={grain} bumpScale={.012} side={DoubleSide}/></mesh>
      {Array.from({length:45},(_,i)=>{const r=g.coreOuterRadius+(g.outerRadius-g.coreOuterRadius)*i/45;return <mesh key={i} position={[0,0,.002]}><ringGeometry args={[r,r+.0009,192]}/><meshBasicMaterial color="#8f7632" transparent opacity={.16} side={DoubleSide}/></mesh>;})}
    </group>)}
  </group>;
}

function Ribbon({ source, version, paused }: Pick<Props,"source"|"version"|"paused">) {
  const mesh=useRef<Mesh>(null);
  const tex = useStripTexture(source,version,1.45);
  const { geometry, original } = useMemo(() => {
    const curve = new CatmullRomCurve3([
      new Vector3(-3.45,-1.2,1.05), new Vector3(-2.6,-1.02,.7),
      new Vector3(-1.65,-.52,.3), new Vector3(-.6,-.95,0), new Vector3(.8,-.95,0),
    ]);
    const pos:number[]=[]; const uv:number[]=[]; const indices:number[]=[];
    for(let i=0;i<=100;i++) { const p=curve.getPoint(i/100); for(let j=0;j<2;j++) { pos.push(p.x,p.y,p.z+(j-.5)*.94); uv.push(i/100,j); } if(i<100) { const a=i*2; indices.push(a,a+2,a+1,a+1,a+2,a+3); } }
    const geometry=new BufferGeometry(); geometry.setAttribute("position",new Float32BufferAttribute(pos,3)); geometry.setAttribute("uv",new Float32BufferAttribute(uv,2)); geometry.setIndex(indices);geometry.computeVertexNormals();
    return {geometry,original:Float32Array.from(pos)};
  },[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(({clock})=>{
    if(paused) return;
    if(!mesh.current)return;
    const liveGeometry=mesh.current.geometry;
    const p=liveGeometry.attributes.position;
    for(let i=0;i<p.count;i++){const t=Math.floor(i/2)/100; p.setY(i,original[i*3+1]+Math.sin(t*7+clock.elapsedTime*.8)*.065*Math.sin(t*Math.PI));}
    p.needsUpdate=true;liveGeometry.computeVertexNormals();
  });
  return <mesh ref={mesh} geometry={geometry}><meshPhysicalMaterial map={tex ?? undefined} color={tex ? "white":"#ffe02b"} side={DoubleSide} roughness={.24} clearcoat={.8} clearcoatRoughness={.17}/></mesh>;
}

function Product({source,version,color,paused,hero,view,angle=0}:Props){
  const group=useRef<Group>(null);
  useFrame(({clock},dt)=>{
    if(!group.current) return;
    const bob=!paused && hero ? Math.sin(clock.elapsedTime*.55)*.045:0;
    group.current.position.y=bob;
    const target=angle+(hero ? -.17:0);
    group.current.rotation.y=paused?target:group.current.rotation.y+(target-group.current.rotation.y)*Math.min(dt*7,1);
  });
  return <group ref={group}>
    {hero || view==="roll" ? <>
      <group position={hero?[.8,.35,0]:[0,.1,0]} rotation={[Math.PI/2,0,0]} scale={1.85}>
        <StudioRoll source={source} version={version} color={color}/>
      </group>
      {hero && <Ribbon source={source} version={version} paused={paused}/>}
    </>:view==="carton"?<CartonBox preset={preset} source={source} version={version} stripLengthMm={220}/>:<DrinkCup widthMm={25} source={source} version={version} stripLengthMm={180}/>}
  </group>;
}

export default function StageG(props:Props){
  const host=useRef<HTMLDivElement>(null);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const el=host.current;if(!el)return;const io=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:"120px"});io.observe(el);return()=>io.disconnect();},[]);
  const hero=!!props.hero;
  const isBox=props.view==="carton";
  const isCup=props.view==="cup";
  return <div ref={host} className="g-canvas">
    <Canvas key={props.view ?? "hero"} aria-label={hero?"Cuộn băng keo in logo và dải băng 3D":"Mẫu băng keo 3D có thể kéo để xoay"} role="img"
      dpr={[1,1.5]} frameloop={visible&&!props.paused?"always":"demand"}
      camera={{position:hero?[3.6,2.6,7.2]:isBox?[6,4.2,7]:isCup?[2.8,2,4.2]:[3,2.1,5.8],fov:hero?36:isBox?40:36,near:.05,far:70}}
      gl={{antialias:true,alpha:true,powerPreference:"high-performance"}} resize={{scroll:false}}>
      <ambientLight intensity={.65}/><directionalLight position={[3,6,5]} intensity={2.2}/><directionalLight position={[-3,2,-4]} intensity={1}/>
      <Environment frames={1} resolution={128}>
        <Lightformer form="rect" intensity={4} position={[0,5,3]} scale={[8,3,1]} rotation={[-Math.PI/2,0,0]}/>
        <Lightformer form="rect" intensity={2} position={[-4,2,2]} scale={[2,7,1]} rotation={[0,Math.PI/2,0]}/>
        <Lightformer form="rect" intensity={1.5} position={[5,1,3]} scale={[3,6,1]} rotation={[0,-Math.PI/2,0]}/>
      </Environment>
      <Suspense fallback={null}><Product {...props}/>
        <ContactShadows position={[0,isBox?-2:isCup?-.88:-1.25,0]} opacity={hero?.28:.32} scale={12} blur={2.8} far={5} resolution={256} frames={1}/>
      </Suspense>
      <OrbitControls key={props.version} makeDefault enablePan={false} enableZoom={false} enableRotate={!hero} enableDamping autoRotate={!hero&&!props.paused&&visible} autoRotateSpeed={.65} minPolarAngle={.3} maxPolarAngle={Math.PI*.78}/>
    </Canvas>
  </div>;
}
