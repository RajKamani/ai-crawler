import asyncio
from app.database import supabase

async def run():
    print('Starting cleanup...')
    try:
        # Instead of not_is_, let's just get all rows, and delete where user_id is not None
        res = supabase.table('crawler_settings').select('*').execute()
        for row in res.data:
            if row.get('user_id') is not None:
                del_res = supabase.table('crawler_settings').delete().eq('id', row['id']).execute()
                print(f"Deleted user row {row['id']}")
        
        # Check globals
        res2 = supabase.table('crawler_settings').select('*').is_('user_id', 'null').execute()
        names = [r["crawler_name"] for r in res2.data]
        print(f'Global settings left: {names}')
        
        # We also need to rename blog_user -> blog_custom, reddit_user -> reddit_custom
        # as per earlier plans, although the UI currently uses "blog_custom" and "reddit_custom".
        # Let's check if we need to update any names.
        for row in res2.data:
            old_name = row['crawler_name']
            if old_name == 'blog_user':
                supabase.table('crawler_settings').update({'crawler_name': 'blog_custom'}).eq('id', row['id']).execute()
                print("Renamed blog_user -> blog_custom")
            elif old_name == 'reddit_user':
                supabase.table('crawler_settings').update({'crawler_name': 'reddit_custom'}).eq('id', row['id']).execute()
                print("Renamed reddit_user -> reddit_custom")

    except Exception as e:
        print("Failed to run script", e)

asyncio.run(run())
