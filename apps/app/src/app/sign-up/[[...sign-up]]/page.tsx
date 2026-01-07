import { SignUp } from "@clerk/nextjs";
import Image from "next/image";

export default function Page() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-10">
        <SignUp />
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          alt=""
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          fill
          src="/placeholder.svg"
        />
      </div>
    </div>
  );
}
