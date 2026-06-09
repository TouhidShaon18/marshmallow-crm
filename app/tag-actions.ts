"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function createTag(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireUser();
  const name = formData.get("name")?.toString().trim();
  const color = formData.get("color")?.toString() ?? "purple";
  if (!name) return { error: "Tag name is required." };

  try {
    await prisma.tag.create({ data: { name, color } });
  } catch {
    return { error: "A tag with that name already exists." };
  }

  revalidatePath("/tags");
  return {};
}

export async function deleteTag(id: string): Promise<void> {
  await requireUser();
  await prisma.tag.delete({ where: { id } });
  revalidatePath("/tags");
  revalidatePath("/customers");
}

export async function addTagToCustomer(customerId: string, tagId: string): Promise<void> {
  await requireUser();
  await prisma.customer.update({
    where: { id: customerId },
    data: { tags: { connect: { id: tagId } } },
  });
  revalidatePath(`/customers/${customerId}`);
}

export async function removeTagFromCustomer(customerId: string, tagId: string): Promise<void> {
  await requireUser();
  await prisma.customer.update({
    where: { id: customerId },
    data: { tags: { disconnect: { id: tagId } } },
  });
  revalidatePath(`/customers/${customerId}`);
}
